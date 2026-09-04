"""
MediKiosk Backend - Main Flask Application

Run with:  python app.py

API base: http://localhost:5000/api
"""

import os
import datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_file
import uuid

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import db
import history_engine
import ocr_module
import summary_generator
import auth_utils
from config import Config


app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

@app.route("/")
def index():
    return "Backend is running!"


# Global rate limiting
# Applies automatically to every route.
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per hour", "1000 per day"],
    storage_uri="memory://",
)


os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


# Real file-content signatures — checked in addition to the extension,
# so a renamed .exe can't slip through just because it's named "scan.jpg"
FILE_SIGNATURES = {
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "pdf": [b"%PDF-"],
}


def verify_file_signature(file_stream, extension: str) -> bool:
    """Reads the first bytes of the upload and checks them against the
    real signature for the claimed extension. Resets the stream after."""
    signatures = FILE_SIGNATURES.get(extension)

    if not signatures:
        return False

    header = file_stream.read(8)
    file_stream.seek(0)

    return any(header.startswith(sig) for sig in signatures)


MAX_DOCUMENTS_PER_PATIENT = 30  # sane cap so one patient can't fill the disk


# =====================================================================
# AUTH — Mock ABHA/Aadhaar login (OTP-based)
# =====================================================================

@app.route("/api/auth/request-otp", methods=["POST"])
@limiter.limit("5 per minute")
def request_otp():
    """
    Step 1 of login. Body JSON: { aadhaar_id }
    MOCK: always "sends" OTP 123456 — no real SMS is triggered.
    Tells the frontend whether this ID belongs to a returning patient.
    """

    data = request.get_json(force=True)
    aadhaar_id = (data.get("aadhaar_id") or "").strip()

    if len(aadhaar_id) < 6:
        return jsonify({"error": "please enter a valid ID"}), 400

    existing = db.query(
        "SELECT patient_id FROM patients WHERE abha_id=%s",
        (aadhaar_id,),
        fetchone=True
    )

    print(f"[MOCK OTP] Sending OTP 123456 to ID {aadhaar_id}")

    return jsonify({"exists": existing is not None})


@app.route("/api/auth/verify-otp", methods=["POST"])
@limiter.limit("5 per minute")
def verify_otp():
    """
    Step 2 of login. Body JSON:
      { aadhaar_id, otp, full_name?, dob?, gender?, phone?, preferred_lang? }

    full_name/dob/gender/phone are required only for a brand-new patient
    (registration happens inline with first-time verification).

    Returns: { status, token, patient }
    """

    data = request.get_json(force=True)
    aadhaar_id = (data.get("aadhaar_id") or "").strip()
    otp = (data.get("otp") or "").strip()

    if otp != auth_utils.MOCK_OTP:
        return jsonify({"error": "incorrect OTP"}), 401

    existing = db.query(
        "SELECT * FROM patients WHERE abha_id=%s",
        (aadhaar_id,),
        fetchone=True
    )

    if existing:
        token = auth_utils.generate_token(existing["patient_id"], aadhaar_id)

        return jsonify({
            "status": "existing_patient",
            "token": token,
            "patient": existing
        })

    # New patient — registration fields required now
    full_name = data.get("full_name")

    if not full_name:
        return jsonify({"error": "full_name is required for new patients"}), 400

    age = None

    if data.get("dob"):
        try:
            dob = datetime.datetime.strptime(
                data["dob"],
                "%Y-%m-%d"
            ).date()

            today = datetime.date.today()

            age = today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day)
            )

        except ValueError:
            pass

    patient_id = db.execute(
        """
        INSERT INTO patients (abha_id, full_name, age, gender, phone, preferred_lang)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (
            aadhaar_id,
            full_name,
            age,
            data.get("gender", "O"),
            data.get("phone"),
            data.get("preferred_lang", "en"),
        ),
    )

    patient = db.query(
        "SELECT * FROM patients WHERE patient_id=%s",
        (patient_id,),
        fetchone=True
    )

    token = auth_utils.generate_token(patient_id, aadhaar_id)

    return jsonify({
        "status": "created",
        "token": token,
        "patient": patient
    }), 201


# =====================================================================
# MODULE D — Patient Identification & Consent
# =====================================================================

@app.route("/api/patients/register", methods=["POST"])
def register_patient():
    """
    LEGACY/DIRECT registration route — kept for backward compatibility and
    direct testing. Normal login now goes through /api/auth/verify-otp,
    which registers new patients inline as part of OTP verification.

    Body JSON:
    {
        abha_id,
        full_name,
        age,
        gender,
        phone,
        preferred_lang,
        department,
        consent_given
    }
    """

    data = request.get_json(force=True)

    if data.get("abha_id"):
        existing = db.query(
            "SELECT * FROM patients WHERE abha_id=%s",
            (data["abha_id"],),
            fetchone=True
        )

        if existing:
            return jsonify({
                "status": "existing_patient",
                "patient": existing
            }), 200

    if not data.get("full_name"):
        return jsonify({"error": "full_name is required"}), 400

    consent_time = (
        datetime.datetime.now()
        if data.get("consent_given")
        else None
    )

    patient_id = db.execute(
        """
        INSERT INTO patients
            (abha_id, full_name, age, gender, phone, preferred_lang,
             department, consent_given, consent_time)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            data.get("abha_id"),
            data["full_name"],
            data.get("age"),
            data.get("gender", "O"),
            data.get("phone"),
            data.get("preferred_lang", "en"),
            data.get("department"),
            bool(data.get("consent_given", False)),
            consent_time,
        ),
    )

    patient = db.query(
        "SELECT * FROM patients WHERE patient_id=%s",
        (patient_id,),
        fetchone=True
    )

    return jsonify({
        "status": "created",
        "patient": patient
    }), 201


@app.route("/api/patients/<int:patient_id>", methods=["GET"])
@auth_utils.require_auth
def get_patient(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    patient = db.query(
        "SELECT * FROM patients WHERE patient_id=%s",
        (patient_id,),
        fetchone=True
    )

    if not patient:
        return jsonify({"error": "not found"}), 404

    return jsonify(patient)


# =====================================================================
# MODULE A — Conversational Multimodal History Engine
# =====================================================================

@app.route("/api/history/start", methods=["POST"])
@auth_utils.require_auth
def start_history_session():
    """
    Step 2 - Converse (start). Creates a new history session for a patient visit.

    Body JSON:
    {
        patient_id,
        chief_complaint,
        mode: 'allopathic'|'ayush'
    }
    """

    data = request.get_json(force=True)

    patient_id = data.get("patient_id")
    chief_complaint = data.get("chief_complaint", "")
    mode = data.get("mode", "allopathic")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    session_id = db.execute(
        """
        INSERT INTO history_sessions
            (patient_id, chief_complaint, mode)
        VALUES (%s,%s,%s)
        """,
        (patient_id, chief_complaint, mode),
    )

    category, question = history_engine.get_next_question(set(), mode)

    return jsonify({
        "session_id": session_id,
        "mode": mode,
        "next_question": (
            {"category": category, **question}
            if question else None
        ),
    }), 201


@app.route("/api/history/answer", methods=["POST"])
@auth_utils.require_auth
def submit_answer():
    """
    Records one answer and returns the next adaptive question
    (or completion signal).

    Body JSON:
    {
        session_id,
        category,
        question_code,
        question_text,
        answer_text,
        input_mode
    }
    """

    data = request.get_json(force=True)

    session_id = data.get("session_id")

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    session = db.query(
        "SELECT * FROM history_sessions WHERE session_id=%s",
        (session_id,),
        fetchone=True
    )

    if not session:
        return jsonify({"error": "session not found"}), 404

    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    is_flag = history_engine.check_red_flag(
        session["chief_complaint"],
        data.get("answer_text", "")
    )

    db.execute(
        """
        INSERT INTO history_qa
            (session_id, category, question_code, question_text,
             answer_text, input_mode, is_red_flag)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            session_id,
            data.get("category"),
            data.get("question_code"),
            data.get("question_text"),
            data.get("answer_text"),
            data.get("input_mode", "touch"),
            is_flag,
        ),
    )

    if is_flag:
        db.execute(
            """
            UPDATE history_sessions
            SET status='flagged_emergency'
            WHERE session_id=%s
            """,
            (session_id,),
        )

    answered_rows = db.query(
        "SELECT question_code FROM history_qa WHERE session_id=%s",
        (session_id,)
    )

    answered_codes = {
        r["question_code"]
        for r in answered_rows
    }

    category, question = history_engine.get_next_question(
        answered_codes,
        session["mode"]
    )

    response = {
        "recorded": True,
        "red_flag_triggered": is_flag,
        "next_question": (
            {"category": category, **question}
            if question else None
        ),
        "interview_complete": question is None,
    }

    return jsonify(response)


@app.route("/api/history/session/<int:session_id>", methods=["GET"])
@auth_utils.require_auth
def get_session_qa(session_id):
    session = db.query(
        "SELECT * FROM history_sessions WHERE session_id=%s",
        (session_id,),
        fetchone=True
    )

    if not session:
        return jsonify({"error": "not found"}), 404

    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    qa = db.query(
        """
        SELECT * FROM history_qa
        WHERE session_id=%s
        ORDER BY qa_id
        """,
        (session_id,)
    )

    return jsonify({
        "session": session,
        "qa": qa
    })


# =====================================================================
# MODULE B — Medical Document Digitization & Intelligence
# =====================================================================

@app.route("/api/documents/upload", methods=["POST"])
@auth_utils.require_auth
def upload_document():
    """
    Step 3 - Scan. Multipart form upload.

    Form fields:
        patient_id,
        session_id (optional),
        doc_type

    File field:
        file
    """

    if "file" not in request.files:
        return jsonify({"error": "no file part"}), 400

    file = request.files["file"]

    patient_id = request.form.get("patient_id")
    session_id = request.form.get("session_id") or None
    doc_type = request.form.get("doc_type", "other")

    valid_doc_types = {
        "prescription",
        "lab_report",
        "discharge_summary",
        "imaging",
        "other"
    }

    if doc_type not in valid_doc_types:
        doc_type = "other"

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({
            "error": "only JPG, PNG, and PDF files are allowed"
        }), 400

    extension = file.filename.rsplit(".", 1)[1].lower()

    if not verify_file_signature(file.stream, extension):
        return jsonify({
            "error": "file content does not match its extension"
        }), 400

    count_row = db.query(
        "SELECT COUNT(*) AS c FROM documents WHERE patient_id=%s",
        (patient_id,),
        fetchone=True
    )

    if count_row and count_row["c"] >= MAX_DOCUMENTS_PER_PATIENT:
        return jsonify({
            "error": (
                f"upload limit reached "
                f"({MAX_DOCUMENTS_PER_PATIENT} documents)"
            )
        }), 400

    # Never trust the original filename for the stored path — generate our own
    safe_name = secure_filename(file.filename)

    stored_filename = (
        f"{patient_id}_{uuid.uuid4().hex}_{safe_name}"
    )

    file_path = os.path.join(
        Config.UPLOAD_FOLDER,
        stored_filename
    )

    file.save(file_path)

    raw_text = ""

    if extension in {"png", "jpg", "jpeg"}:
        raw_text = ocr_module.run_ocr(file_path)

    document_id = db.execute(
        """
        INSERT INTO documents
            (patient_id, session_id, doc_type, file_path, raw_ocr_text)
        VALUES (%s,%s,%s,%s,%s)
        """,
        (
            patient_id,
            session_id,
            doc_type,
            file_path,
            raw_text
        ),
    )

    entities = []

    if raw_text:
        entities = ocr_module.extract_entities(raw_text)

        for e in entities:
            db.execute(
                """
                INSERT INTO extracted_entities
                    (document_id, entity_type, entity_name, value,
                     unit, reference_range, is_abnormal)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    document_id,
                    e["entity_type"],
                    e["entity_name"],
                    e["value"],
                    e["unit"],
                    e["reference_range"],
                    e["is_abnormal"],
                ),
            )

    return jsonify({
        "document_id": document_id,
        "original_filename": safe_name,
        "doc_type": doc_type,
        "raw_ocr_text": raw_text,
        "extracted_entities": entities,
    }), 201


@app.route("/api/documents/patient/<int:patient_id>", methods=["GET"])
@auth_utils.require_auth
def list_patient_documents(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    docs = db.query(
        """
        SELECT document_id, doc_type, file_path,
               document_date, uploaded_at
        FROM documents
        WHERE patient_id=%s
        ORDER BY uploaded_at DESC
        """,
        (patient_id,),
    )

    return jsonify(docs)


@app.route("/api/documents/<int:document_id>/file", methods=["GET"])
@auth_utils.require_auth
def get_document_file(document_id):
    doc = db.query(
        "SELECT * FROM documents WHERE document_id=%s",
        (document_id,),
        fetchone=True
    )

    if not doc:
        return jsonify({"error": "not found"}), 404

    if not auth_utils.owns_patient(doc["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    if not os.path.exists(doc["file_path"]):
        return jsonify({"error": "file missing on server"}), 404

    return send_file(doc["file_path"])


@app.route("/api/documents/<int:document_id>", methods=["DELETE"])
@auth_utils.require_auth
def delete_document(document_id):
    doc = db.query(
        "SELECT * FROM documents WHERE document_id=%s",
        (document_id,),
        fetchone=True
    )

    if not doc:
        return jsonify({"error": "not found"}), 404

    if not auth_utils.owns_patient(doc["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    db.execute(
        "DELETE FROM extracted_entities WHERE document_id=%s",
        (document_id,)
    )

    db.execute(
        "DELETE FROM documents WHERE document_id=%s",
        (document_id,)
    )

    if os.path.exists(doc["file_path"]):
        try:
            os.remove(doc["file_path"])
        except OSError:
            pass  # DB row is already gone; stray file isn't demo-blocking

    return jsonify({
        "status": "deleted",
        "document_id": document_id
    })


# =====================================================================
# MODULE C — Structured History Summary Generator
# =====================================================================

@app.route("/api/summary/generate/<int:session_id>", methods=["POST"])
@auth_utils.require_auth
def generate_summary(session_id):
    """
    Step 4 - Summarize & Route. Builds and stores the structured summary.
    """

    session = db.query(
        """
        SELECT patient_id
        FROM history_sessions
        WHERE session_id=%s
        """,
        (session_id,),
        fetchone=True
    )
import requests  # make sure this is at the top of app.py

@app.route("/api/ai-summary/<int:session_id>", methods=["POST"])
@auth_utils.require_auth
def ai_summary(session_id):
    """
    Alternative summary generator using external AI service.
    """

    session = db.query(
        "SELECT patient_id FROM history_sessions WHERE session_id=%s",
        (session_id,),
        fetchone=True
    )

    if not session:
        return jsonify({"error": "session not found"}), 404

    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    # Call external AI API using the key from Config
    response = requests.post(
        "https://api.huatuogpt.com/v1/chat",
        headers={"Authorization": f"Bearer {Config.HUATUO_API_KEY}"},
        json={"input": f"Summarize session {session_id}"}
    )

    if response.status_code != 200:
        return jsonify({"error": "AI service failed"}), 500

    ai_output = response.json()

    return jsonify({
        "session_id": session_id,
        "summary_json": ai_output.get("structured"),
        "summary_text": ai_output.get("text")
    })

    if not session:
        return jsonify({"error": "session not found"}), 404

    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    try:
        structured, text = summary_generator.build_summary(session_id)

    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    return jsonify({
        "session_id": session_id,
        "summary_json": structured,
        "summary_text": text
    })


@app.route("/api/summary/<int:session_id>", methods=["GET"])
@auth_utils.require_auth
def get_summary(session_id):
    session = db.query(
        """
        SELECT patient_id
        FROM history_sessions
        WHERE session_id=%s
        """,
        (session_id,),
        fetchone=True
    )

    if not session:
        return jsonify({"error": "not found"}), 404

    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    summary = db.query(
        """
        SELECT * FROM clinical_summaries
        WHERE session_id=%s
        """,
        (session_id,),
        fetchone=True
    )

    if not summary:
        return jsonify({
            "error": "summary not yet generated"
        }), 404

    return jsonify(summary)


@app.route("/api/summary/<int:session_id>/confirm", methods=["POST"])
def confirm_summary(session_id):
    """
    Step 5 - Consult. Physician edits/confirms and (simulated)
    pushes to HIS + ABHA.

    NOTE: intentionally NOT patient-auth-protected — this is a physician-side
    action. Physician auth/authorization will be added when the physician
    login flow is built.

    Body JSON (optional):
        { edited_summary_text }
    """

    data = request.get_json(force=True, silent=True) or {}
    edited_text = data.get("edited_summary_text")

    if edited_text:
        db.execute(
            """
            UPDATE clinical_summaries
            SET summary_text=%s,
                physician_edited=TRUE,
                pushed_to_his=TRUE,
                abha_linked=TRUE
            WHERE session_id=%s
            """,
            (edited_text, session_id),
        )

    else:
        db.execute(
            """
            UPDATE clinical_summaries
            SET pushed_to_his=TRUE,
                abha_linked=TRUE
            WHERE session_id=%s
            """,
            (session_id,),
        )

    summary = db.query(
        """
        SELECT * FROM clinical_summaries
        WHERE session_id=%s
        """,
        (session_id,),
        fetchone=True
    )

    return jsonify({
        "status": "confirmed_and_pushed",
        "summary": summary
    })


# =====================================================================
# Health check
# =====================================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "MediKiosk backend"
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=Config.DEBUG
    )
