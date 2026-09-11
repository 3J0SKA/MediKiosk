"""
MediKiosk Backend - Main Flask Application

Run with: python app.py
API base: http://localhost:5000/api
"""

import os
import io
import time
import uuid
import base64
import datetime
import warnings
import json as json_lib
from datetime import datetime as dt
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

import torch
import soundfile as sf
from gtts import gTTS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import google.generativeai as genai
from report_synthesizer import synthesize_structured_summary
from pdf_report import generate_summary_pdf
from report_synthesizer import synthesize_structured_summary, compute_priority

# Local modules
import gemini_service
import db
import history_engine
import ocr_module
import summary_generator
import auth_utils
from config import Config

warnings.filterwarnings("ignore")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)


def generate_fast_audio(text: str, lang: str = "en") -> str:
    """Generates audio 100% in RAM with zero disk I/O as a fallback."""
    if not text.strip():
        text = "Please tell me more about your symptoms."

    supported_langs = ["en", "hi", "pa", "ta", "bn"]
    gtts_lang = lang if lang in supported_langs else "en"

    try:
        my_tts = gTTS(text=text, lang=gtts_lang, slow=False)
        audio_buffer = io.BytesIO()
        my_tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return base64.b64encode(audio_buffer.read()).decode("utf-8")
    except Exception as e:
        print(f"TTS Generation Error: {e}")
        return ""


@app.route("/")
def index():
    return "Backend is running!"


# Global rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per hour", "1000 per day"],
    storage_uri="memory://",
)

os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


# Real file-content signatures
FILE_SIGNATURES = {
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "pdf": [b"%PDF-"],
}


def verify_file_signature(file_stream, extension: str) -> bool:
    signatures = FILE_SIGNATURES.get(extension)
    if not signatures:
        return False
    header = file_stream.read(8)
    file_stream.seek(0)
    return any(header.startswith(sig) for sig in signatures)


MAX_DOCUMENTS_PER_PATIENT = 30


# =====================================================================
# AUTH — Mock ABHA/Aadhaar login (OTP-based)
# =====================================================================

@app.route("/api/report/generate-pdf", methods=["POST"])
def generate_pdf_report():
    data = request.get_json(force=True) or {}

    patient_id = data.get("patientId")
    patient_name = data.get("patientName", "Patient")
    department = data.get("department", "General Medicine")
    ai_summary = data.get("aiSummary", "")
    doc_summary = data.get("docSummary", "")

    try:
        structured = synthesize_structured_summary(ai_summary, doc_summary)
    except RuntimeError as e:
        print(f"[report] synthesis failed, falling back to minimal structure: {e}")
        structured = {
            "chief_complaint": None,
            "history_of_present_illness": ai_summary or "Could not synthesize — raw text below.",
            "symptoms": [], "onset_duration": None, "severity": None,
            "current_medications": [], "past_medical_history": [],
            "abnormal_lab_findings": [], "allergies": [], "red_flags": [],
            "physician_notes": doc_summary or None,
        }

    priority = compute_priority(structured)

    if patient_id:
        try:
            db.execute(
                """
                INSERT INTO final_summaries
                    (patient_id, chief_complaint, priority, structured_json, ai_summary_raw, doc_summary_raw)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    chief_complaint=VALUES(chief_complaint),
                    priority=VALUES(priority),
                    structured_json=VALUES(structured_json),
                    ai_summary_raw=VALUES(ai_summary_raw),
                    doc_summary_raw=VALUES(doc_summary_raw),
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    patient_id,
                    structured.get("chief_complaint"),
                    priority,
                    json_lib.dumps(structured),
                    ai_summary,
                    doc_summary,
                ),
            )
        except Exception as e:
            print(f"[report] failed to save final_summaries row: {e}")  # PDF still generates even if this fails

    try:
        pdf_bytes = generate_summary_pdf(
            patient_name=patient_name, patient_id=patient_id,
            department=department, structured=structured,
        )
    except Exception as e:
        print(f"[pdf] generation failed: {e}")
        return jsonify({"error": f"PDF generation failed: {e}"}), 500

    return (
        pdf_bytes, 200,
        {
            "Content-Type": "application/pdf",
            "Content-Disposition": f'attachment; filename="Medical_Summary_{patient_name.replace(" ", "_")}.pdf"',
        },
    )

@app.route("/api/auth/request-otp", methods=["POST"])
@limiter.limit("5 per minute")
def request_otp():
    data = request.get_json(force=True)
    aadhaar_id = (data.get("aadhaar_id") or "").strip()

    if len(aadhaar_id) < 6:
        return jsonify({"error": "please enter a valid ID"}), 400

    existing = db.query(
        "SELECT patient_id FROM patients WHERE abha_id=%s",
        (aadhaar_id,),
        fetchone=True
    )
    print("[MOCK OTP] Sending OTP 123456 to requested ID")
    return jsonify({"exists": existing is not None})


@app.route("/api/auth/verify-otp", methods=["POST"])
@limiter.limit("5 per minute")
def verify_otp():
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

    full_name = data.get("full_name")
    if not full_name:
        return jsonify({"error": "full_name is required for new patients"}), 400

    age = None
    if data.get("dob"):
        try:
            dob = datetime.datetime.strptime(data["dob"], "%Y-%m-%d").date()
            today = datetime.date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        except ValueError:
            pass

    patient_id = db.execute(
        """
        INSERT INTO patients (abha_id, full_name, age, gender, phone, preferred_lang)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (aadhaar_id, full_name, age, data.get("gender", "O"), data.get("phone"), data.get("preferred_lang", "en")),
    )

    patient = db.query("SELECT * FROM patients WHERE patient_id=%s", (patient_id,), fetchone=True)
    token = auth_utils.generate_token(patient_id, aadhaar_id)

    return jsonify({"status": "created", "token": token, "patient": patient}), 201


# =====================================================================
# MODULE D — Patient Identification & Consent
# =====================================================================

@app.route("/api/physician/patients", methods=["GET"])
def list_physician_patients():
    """
    All patients who have a completed final summary, newest first,
    for the physician queue.
    """
    rows = db.query(
        """
        SELECT p.patient_id, p.full_name, p.age, p.gender, p.preferred_lang,
               fs.chief_complaint, fs.priority, fs.updated_at
        FROM final_summaries fs
        JOIN patients p ON p.patient_id = fs.patient_id
        ORDER BY
            FIELD(fs.priority, 'high', 'medium', 'low'),
            fs.updated_at DESC
        """
    )
    for r in rows:
        r["updated_at"] = r["updated_at"].isoformat() if r["updated_at"] else None
    return jsonify(rows)


@app.route("/api/physician/patients/<int:patient_id>", methods=["GET"])
def get_physician_patient_detail(patient_id):
    """Full structured summary + document list for one patient."""
    patient = db.query("SELECT * FROM patients WHERE patient_id=%s", (patient_id,), fetchone=True)
    if not patient:
        return jsonify({"error": "not found"}), 404

    summary_row = db.query(
        "SELECT * FROM final_summaries WHERE patient_id=%s", (patient_id,), fetchone=True
    )
    structured = json_lib.loads(summary_row["structured_json"]) if summary_row else None

    docs = db.query(
        """
        SELECT document_id, doc_type, document_date, uploaded_at
        FROM documents WHERE patient_id=%s
        ORDER BY uploaded_at DESC
        """,
        (patient_id,),
    )
    for d in docs:
        d["uploaded_at"] = d["uploaded_at"].isoformat() if d["uploaded_at"] else None
        d["document_date"] = d["document_date"].isoformat() if d["document_date"] else None

    return jsonify({
        "patient": patient,
        "priority": summary_row["priority"] if summary_row else None,
        "chief_complaint": summary_row["chief_complaint"] if summary_row else None,
        "structured_summary": structured,
        "documents": docs,
    })


@app.route("/api/physician/documents/<int:document_id>/file", methods=["GET"])
def get_physician_document_file(document_id):
    """Physician-side file view — no patient-ownership check (physician auth TODO)."""
    doc = db.query("SELECT * FROM documents WHERE document_id=%s", (document_id,), fetchone=True)
    if not doc or not os.path.exists(doc["file_path"]):
        return jsonify({"error": "not found"}), 404
    return send_file(doc["file_path"])

@app.route("/api/patients/register", methods=["POST"])
def register_patient():
    data = request.get_json(force=True)

    if data.get("abha_id"):
        existing = db.query(
            "SELECT * FROM patients WHERE abha_id=%s",
            (data["abha_id"],),
            fetchone=True
        )
        if existing:
            return jsonify({"status": "existing_patient", "patient": existing}), 200

    if not data.get("full_name"):
        return jsonify({"error": "full_name is required"}), 400

    consent_time = datetime.datetime.now() if data.get("consent_given") else None

    patient_id = db.execute(
        """
        INSERT INTO patients
            (abha_id, full_name, age, gender, phone, preferred_lang, department, consent_given, consent_time)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (data.get("abha_id"), data["full_name"], data.get("age"), data.get("gender", "O"), data.get("phone"),
         data.get("preferred_lang", "en"), data.get("department"), bool(data.get("consent_given", False)), consent_time),
    )

    patient = db.query("SELECT * FROM patients WHERE patient_id=%s", (patient_id,), fetchone=True)
    return jsonify({"status": "created", "patient": patient}), 201


@app.route("/api/patients/<int:patient_id>", methods=["GET"])
@auth_utils.require_auth
def get_patient(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    patient = db.query("SELECT * FROM patients WHERE patient_id=%s", (patient_id,), fetchone=True)
    if not patient:
        return jsonify({"error": "not found"}), 404

    return jsonify(patient)


# =====================================================================
# MODULE A — Conversational Multimodal History Engine
# =====================================================================

@app.route("/api/history/start", methods=["POST"])
@auth_utils.require_auth
def start_history_session():
    data = request.get_json(force=True)
    patient_id = data.get("patient_id")
    chief_complaint = data.get("chief_complaint", "")
    mode = data.get("mode", "allopathic")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    session_id = db.execute(
        "INSERT INTO history_sessions (patient_id, chief_complaint, mode) VALUES (%s,%s,%s)",
        (patient_id, chief_complaint, mode),
    )
    category, question = history_engine.get_next_question(set(), mode)

    return jsonify({
        "session_id": session_id,
        "mode": mode,
        "next_question": ({"category": category, **question} if question else None),
    }), 201


@app.route("/api/history/answer", methods=["POST"])
@auth_utils.require_auth
def submit_answer():
    data = request.get_json(force=True)
    session_id = data.get("session_id")

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    session = db.query("SELECT * FROM history_sessions WHERE session_id=%s", (session_id,), fetchone=True)
    if not session:
        return jsonify({"error": "session not found"}), 404
    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    is_flag = history_engine.check_red_flag(session["chief_complaint"], data.get("answer_text", ""))

    db.execute(
        """
        INSERT INTO history_qa
            (session_id, category, question_code, question_text, answer_text, input_mode, is_red_flag)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (session_id, data.get("category"), data.get("question_code"), data.get("question_text"),
         data.get("answer_text"), data.get("input_mode", "touch"), is_flag),
    )

    if is_flag:
        db.execute("UPDATE history_sessions SET status='flagged_emergency' WHERE session_id=%s", (session_id,))

    answered_rows = db.query("SELECT question_code FROM history_qa WHERE session_id=%s", (session_id,))
    answered_codes = {r["question_code"] for r in answered_rows}
    category, question = history_engine.get_next_question(answered_codes, session["mode"])

    return jsonify({
        "recorded": True,
        "red_flag_triggered": is_flag,
        "next_question": ({"category": category, **question} if question else None),
        "interview_complete": question is None,
    })


@app.route("/api/history/session/<int:session_id>", methods=["GET"])
@auth_utils.require_auth
def get_session_qa(session_id):
    session = db.query("SELECT * FROM history_sessions WHERE session_id=%s", (session_id,), fetchone=True)
    if not session:
        return jsonify({"error": "not found"}), 404
    if not auth_utils.owns_patient(session["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    qa = db.query("SELECT * FROM history_qa WHERE session_id=%s ORDER BY qa_id", (session_id,))
    return jsonify({"session": session, "qa": qa})


# =====================================================================
# MODULE B — Medical Document Digitization & Intelligence
# =====================================================================

@app.route("/api/documents/upload", methods=["POST"])
@auth_utils.require_auth
def upload_document():
    if "file" not in request.files:
        return jsonify({"error": "no file part"}), 400

    file = request.files["file"]
    patient_id = request.form.get("patient_id")
    session_id = request.form.get("session_id") or None
    doc_type = request.form.get("doc_type", "other")
    valid_doc_types = {"prescription", "lab_report", "discharge_summary", "imaging", "other"}

    if doc_type not in valid_doc_types:
        doc_type = "other"

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "only JPG, PNG, and PDF files are allowed"}), 400

    extension = file.filename.rsplit(".", 1)[1].lower()
    if not verify_file_signature(file.stream, extension):
        return jsonify({"error": "file content does not match its extension"}), 400

    count_row = db.query("SELECT COUNT(*) AS c FROM documents WHERE patient_id=%s", (patient_id,), fetchone=True)
    if count_row and count_row["c"] >= MAX_DOCUMENTS_PER_PATIENT:
        return jsonify({"error": f"upload limit reached ({MAX_DOCUMENTS_PER_PATIENT} documents)"}), 400

    safe_name = secure_filename(file.filename)
    stored_filename = f"{patient_id}_{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(Config.UPLOAD_FOLDER, stored_filename)
    file.save(file_path)

    raw_text = ""
    if extension in {"png", "jpg", "jpeg"}:
        raw_text = ocr_module.run_ocr(file_path)

    document_id = db.execute(
        "INSERT INTO documents (patient_id, session_id, doc_type, file_path, raw_ocr_text) VALUES (%s,%s,%s,%s,%s)",
        (patient_id, session_id, doc_type, file_path, raw_text),
    )

    entities = []
    if raw_text:
        entities = ocr_module.extract_entities(raw_text)
        for e in entities:
            db.execute(
                """
                INSERT INTO extracted_entities
                    (document_id, entity_type, entity_name, value, unit, reference_range, is_abnormal)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (document_id, e["entity_type"], e["entity_name"], e["value"], e["unit"], e["reference_range"], e["is_abnormal"]),
            )

    return jsonify({
        "document_id": document_id,
        "original_filename": safe_name,
        "doc_type": doc_type,
        "raw_ocr_text": raw_text,
        "extracted_entities": entities,
    }), 201


@app.route("/api/documents/patient/<int:patient_id>/summarize-all", methods=["POST"])
@auth_utils.require_auth
@limiter.limit("5 per hour")
def summarize_all_documents(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    force = request.args.get("force", "false").lower() == "true"
    docs = db.query("SELECT * FROM documents WHERE patient_id=%s ORDER BY uploaded_at DESC", (patient_id,))
    results = []

    for doc in docs:
        document_id = doc["document_id"]
        entry = {"document_id": document_id, "doc_type": doc["doc_type"]}

        if not force:
            cached = db.query("SELECT * FROM ai_extractions WHERE document_id=%s", (document_id,), fetchone=True)
            if cached:
                entry.update({
                    "cached": True,
                    "result": json_lib.loads(cached["result_json"]),
                    "needs_review": bool(cached["needs_review"]),
                })
                results.append(entry)
                continue

        if not os.path.exists(doc["file_path"]):
            entry.update({"error": "file missing on server"})
            results.append(entry)
            continue

        try:
            result = gemini_service.extract_from_document(doc["file_path"], doc["doc_type"])
            needs_review = bool(result.get("needs_review", False))
            db.execute(
                """
                INSERT INTO ai_extractions (document_id, model_used, result_json, needs_review)
                VALUES (%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    model_used=VALUES(model_used),
                    result_json=VALUES(result_json),
                    needs_review=VALUES(needs_review),
                    created_at=CURRENT_TIMESTAMP
                """,
                (document_id, Config.GEMINI_MODEL, json_lib.dumps(result), needs_review),
            )
            extracted_date = result.get("date")
            if extracted_date:
                for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
                    try:
                        parsed = dt.strptime(extracted_date, fmt).date()
                        db.execute("UPDATE documents SET document_date=%s WHERE document_id=%s", (parsed, document_id))
                        break
                    except ValueError:
                        continue
            entry.update({"cached": False, "result": result, "needs_review": needs_review})
        except RuntimeError as e:
            entry.update({"error": str(e)})

        results.append(entry)

    return jsonify({"results": results})


@app.route("/api/documents/patient/<int:patient_id>", methods=["GET"])
@auth_utils.require_auth
def list_patient_documents(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    docs = db.query(
        """
        SELECT document_id, doc_type, file_path, document_date, uploaded_at
        FROM documents
        WHERE patient_id=%s
        ORDER BY uploaded_at DESC
        """,
        (patient_id,),
    )
    return jsonify(docs)


@app.route("/api/documents/patient/<int:patient_id>/combined-summary", methods=["GET"])
@auth_utils.require_auth
def combined_document_summary(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    rows = db.query(
        """
        SELECT d.document_id, d.doc_type, d.document_date, d.uploaded_at, e.result_json, e.needs_review
        FROM documents d
        LEFT JOIN ai_extractions e ON e.document_id = d.document_id
        WHERE d.patient_id=%s
        ORDER BY COALESCE(d.document_date, d.uploaded_at) ASC
        """,
        (patient_id,),
    )

    timeline, abnormal_tests, all_medications = [], [], []
    any_needs_review = False

    for row in rows:
        entry = {
            "document_id": row["document_id"],
            "doc_type": row["doc_type"],
            "document_date": row["document_date"].isoformat() if row["document_date"] else None,
            "uploaded_at": row["uploaded_at"].isoformat() if row["uploaded_at"] else None,
            "summarised": row["result_json"] is not None,
            "needs_review": bool(row["needs_review"]) if row["needs_review"] is not None else False,
            "result": json_lib.loads(row["result_json"]) if row["result_json"] else None,
        }
        timeline.append(entry)

        if entry["needs_review"]:
            any_needs_review = True

        if entry["result"]:
            for test in entry["result"].get("tests", []) or []:
                if test.get("is_abnormal"):
                    abnormal_tests.append({**test, "document_id": row["document_id"], "date": entry["document_date"]})
            for med in entry["result"].get("medications", []) or []:
                all_medications.append({**med, "document_id": row["document_id"], "source": "prescription"})
            for med_name in entry["result"].get("medications_on_discharge", []) or []:
                all_medications.append({"name": med_name, "document_id": row["document_id"], "source": "discharge_summary"})

    unique_med_names = {m["name"].strip().lower() for m in all_medications if m.get("name")}
    interaction_note = None
    if len(unique_med_names) >= 2:
        interaction_note = "Multiple medications found across documents — a physician should review for potential drug interactions."

    return jsonify({
        "timeline": timeline,
        "abnormal_tests": abnormal_tests,
        "all_medications": all_medications,
        "interaction_note": interaction_note,
        "any_needs_review": any_needs_review,
        "total_documents": len(rows),
        "summarised_count": sum(1 for r in timeline if r["summarised"]),
    })


@app.route("/api/documents/patient/<int:patient_id>/clear-all", methods=["DELETE"])
@auth_utils.require_auth
def clear_all_documents(patient_id):
    if not auth_utils.owns_patient(patient_id):
        return jsonify({"error": "forbidden"}), 403

    docs = db.query("SELECT document_id, file_path FROM documents WHERE patient_id=%s", (patient_id,))
    for doc in docs:
        if os.path.exists(doc["file_path"]):
            try:
                os.remove(doc["file_path"])
            except OSError:
                pass

    db.execute("DELETE FROM extracted_entities WHERE document_id IN (SELECT document_id FROM documents WHERE patient_id=%s)", (patient_id,))
    db.execute("DELETE FROM ai_extractions WHERE document_id IN (SELECT document_id FROM documents WHERE patient_id=%s)", (patient_id,))
    db.execute("DELETE FROM documents WHERE patient_id=%s", (patient_id,))

    return jsonify({"status": "cleared", "deleted_count": len(docs)})


@app.route("/api/documents/<int:document_id>/summarize", methods=["POST"])
@auth_utils.require_auth
def summarize_single_document(document_id):
    doc = db.query("SELECT * FROM documents WHERE document_id=%s", (document_id,), fetchone=True)
    if not doc:
        return jsonify({"error": "document not found"}), 404
    if not auth_utils.owns_patient(doc["patient_id"]):
        return jsonify({"error": "forbidden"}), 403

    try:
        result = gemini_service.extract_from_document(doc["file_path"], doc["doc_type"])
        needs_review = bool(result.get("needs_review", False))
        db.execute(
            """
            INSERT INTO ai_extractions (document_id, model_used, result_json, needs_review)
            VALUES (%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
                model_used=VALUES(model_used),
                result_json=VALUES(result_json),
                needs_review=VALUES(needs_review),
                created_at=CURRENT_TIMESTAMP
            """,
            (document_id, Config.GEMINI_MODEL, json_lib.dumps(result), needs_review),
        )
        return jsonify({"status": "success", "result": result, "needs_review": needs_review})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# AI INTAKE CHAT & DECOUPLED TTS ENDPOINTS
# =====================================================================

INTAKE_SYSTEM_PROMPT = (
    "You are an empathetic, professional AI medical intake assistant for MediKiosk. "
    "Your primary goal is to gather a detailed history of present illness and current symptoms from the patient. "
    "When a patient describes how they feel or what symptoms they have, ask focused, gentle follow-up questions "
    "one at a time to clarify the location, onset, duration, severity, character, and aggravating/relieving factors. "
    "Keep your messages concise, simple, and supportive. Do NOT offer medical diagnoses, treatments, or prescriptions. "
    "Focus entirely on gathering complete clinical history to prepare for the physician."
)

# --- 1. INITIALIZE GEMINI ---
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# --- 2. INITIALIZE TTS MODEL (LOADS ONCE ON STARTUP) ---
hf_token = os.getenv("HF_TOKEN")
device = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"➜ Loading Indic Parler-TTS on {device}...")

try:
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer

    tts_model = ParlerTTSForConditionalGeneration.from_pretrained(
        "ai4bharat/indic-parler-tts", token=hf_token
    ).to(device)

    tokenizer = AutoTokenizer.from_pretrained("ai4bharat/indic-parler-tts", token=hf_token)
    description_tokenizer = AutoTokenizer.from_pretrained(
        tts_model.config.text_encoder._name_or_path, token=hf_token
    )
    print("✅ TTS Model loaded successfully and ready.")
except Exception as e:
    print(f"❌ Failed to load TTS model: {e}")
    tts_model = None


@app.route('/api/chat/intake', methods=['POST'])
def intake_chat():
    """Generates text response from Gemini immediately without blocking for TTS."""
    try:
        data = request.get_json(silent=True) or {}
        user_text = data.get('message') or data.get('prompt') or ''
        lang = data.get('lang', 'en')

        if not user_text:
            return jsonify({"reply": "Please describe your symptoms."}), 400

        lang_names = {
            "en": "English",
            "hi": "Hindi",
            "pa": "Punjabi",
            "ta": "Tamil",
            "bn": "Bengali"
        }
        target_lang = lang_names.get(lang, "English")

        model = genai.GenerativeModel('gemini-3.6-flash')
        prompt = (
            f"You are a medical kiosk intake assistant. "
            f"Reply compassionately in 1-2 sentences and ask 1 follow-up question. "
            f"IMPORTANT: Respond entirely in the {target_lang} language.\n"
            f"Patient input: {user_text}"
        )

        gemini_response = model.generate_content(prompt)
        ai_text = gemini_response.text

        # Return text instantly to frontend
        return jsonify({
            "reply": ai_text
        })

    except Exception as e:
        print(f"Backend Error: {e}")
        return jsonify({"reply": f"Server Error: {str(e)}"}), 500


@app.route('/api/chat/tts', methods=['POST'])
def generate_tts():
    """Dedicated endpoint to process heavy TTS generation asynchronously."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get('text', '')
        lang = data.get('lang', 'en')

        if not text.strip():
            return jsonify({"audio": None}), 400

        audio_base64 = None

        if tts_model:
            description = "Divya speaks in a clear, expressive voice at a normal pace in a quiet environment with very clear audio quality."

            input_ids = description_tokenizer(description, return_tensors="pt").input_ids.to(device)
            prompt_input_ids = tokenizer(text, return_tensors="pt").input_ids.to(device)

            generation = tts_model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)
            audio_arr = generation.cpu().numpy().squeeze()

            buffer = io.BytesIO()
            sf.write(buffer, audio_arr, tts_model.config.sampling_rate, format='WAV')
            buffer.seek(0)
            audio_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        else:
            # Fallback to fast gTTS if Parler-TTS is unavailable
            audio_base64 = generate_fast_audio(text, lang)

        return jsonify({"audio": audio_base64})

    except Exception as e:
        print(f"TTS Route Error: {e}")
        return jsonify({"audio": None, "error": str(e)}), 500


@app.route("/api/intake/complete", methods=["POST"])
def intake_complete():
    data = request.json or {}
    patient_id = data.get("patientId")
    chat_history = data.get("chatHistory", [])
    lang = data.get("lang", "en")

    print(f"✅ Successfully received intake for patient: {patient_id} ({len(chat_history)} messages)")

    return jsonify({
        "status": "success",
        "message": "Intake saved successfully.",
        "patientId": patient_id
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)