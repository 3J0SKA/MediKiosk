"""
app.py
MediKiosk Backend - Main Flask Application

Run with:  python app.py
API base:  http://localhost:5000/api
"""

import os
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

import db
import history_engine
import ocr_module
import summary_generator
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


# =====================================================================
# MODULE D — Patient Identification & Consent
# =====================================================================

@app.route("/api/patients/register", methods=["POST"])
def register_patient():
    """
    Step 1 - Identify. Registers a new patient (or returns existing one by ABHA ID).
    Body JSON: { abha_id, full_name, age, gender, phone, preferred_lang, department, consent_given }
    """
    data = request.get_json(force=True)

    if data.get("abha_id"):
        existing = db.query(
            "SELECT * FROM patients WHERE abha_id=%s", (data["abha_id"],), fetchone=True
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
    patient = db.query("SELECT * FROM patients WHERE patient_id=%s", (patient_id,), fetchone=True)
    return jsonify({"status": "created", "patient": patient}), 201


@app.route("/api/patients/<int:patient_id>", methods=["GET"])
def get_patient(patient_id):
    patient = db.query("SELECT * FROM patients WHERE patient_id=%s", (patient_id,), fetchone=True)
    if not patient:
        return jsonify({"error": "not found"}), 404
    return jsonify(patient)


# =====================================================================
# MODULE A — Conversational Multimodal History Engine
# =====================================================================

@app.route("/api/history/start", methods=["POST"])
def start_history_session():
    """
    Step 2 - Converse (start). Creates a new history session for a patient visit.
    Body JSON: { patient_id, chief_complaint, mode: 'allopathic'|'ayush' }
    """
    data = request.get_json(force=True)
    patient_id = data.get("patient_id")
    chief_complaint = data.get("chief_complaint", "")
    mode = data.get("mode", "allopathic")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    session_id = db.execute(
        "INSERT INTO history_sessions (patient_id, chief_complaint, mode) VALUES (%s,%s,%s)",
        (patient_id, chief_complaint, mode),
    )

    category, question = history_engine.get_next_question(set(), mode)
    return jsonify({
        "session_id": session_id,
        "mode": mode,
        "next_question": {"category": category, **question} if question else None,
    }), 201


@app.route("/api/history/answer", methods=["POST"])
def submit_answer():
    """
    Records one answer and returns the next adaptive question (or completion signal).
    Body JSON: { session_id, category, question_code, question_text, answer_text, input_mode }
    """
    data = request.get_json(force=True)
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    session = db.query(
        "SELECT * FROM history_sessions WHERE session_id=%s", (session_id,), fetchone=True
    )
    if not session:
        return jsonify({"error": "session not found"}), 404

    is_flag = history_engine.check_red_flag(session["chief_complaint"], data.get("answer_text", ""))

    db.execute(
        """
        INSERT INTO history_qa
            (session_id, category, question_code, question_text, answer_text, input_mode, is_red_flag)
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
            "UPDATE history_sessions SET status='flagged_emergency' WHERE session_id=%s",
            (session_id,),
        )

    answered_rows = db.query(
        "SELECT question_code FROM history_qa WHERE session_id=%s", (session_id,)
    )
    answered_codes = {r["question_code"] for r in answered_rows}

    category, question = history_engine.get_next_question(answered_codes, session["mode"])

    response = {
        "recorded": True,
        "red_flag_triggered": is_flag,
        "next_question": {"category": category, **question} if question else None,
        "interview_complete": question is None,
    }
    return jsonify(response)


@app.route("/api/history/session/<int:session_id>", methods=["GET"])
def get_session_qa(session_id):
    session = db.query(
        "SELECT * FROM history_sessions WHERE session_id=%s", (session_id,), fetchone=True
    )
    if not session:
        return jsonify({"error": "not found"}), 404
    qa = db.query(
        "SELECT * FROM history_qa WHERE session_id=%s ORDER BY qa_id", (session_id,)
    )
    return jsonify({"session": session, "qa": qa})


# =====================================================================
# MODULE B — Medical Document Digitization & Intelligence
# =====================================================================

@app.route("/api/documents/upload", methods=["POST"])
def upload_document():
    """
    Step 3 - Scan. Multipart form upload.
    Form fields: patient_id, session_id (optional), doc_type
    File field: file
    """
    if "file" not in request.files:
        return jsonify({"error": "no file part"}), 400

    file = request.files["file"]
    patient_id = request.form.get("patient_id")
    session_id = request.form.get("session_id") or None
    doc_type = request.form.get("doc_type", "other")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "invalid or missing file"}), 400

    filename = secure_filename(f"{patient_id}_{datetime.datetime.now().timestamp()}_{file.filename}")
    file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
    file.save(file_path)

    # OCR (image files only; for PDFs a page-render step is needed — see README)
    raw_text = ""
    if filename.rsplit(".", 1)[1].lower() in {"png", "jpg", "jpeg"}:
        raw_text = ocr_module.run_ocr(file_path)

    document_id = db.execute(
        """
        INSERT INTO documents (patient_id, session_id, doc_type, file_path, raw_ocr_text)
        VALUES (%s,%s,%s,%s,%s)
        """,
        (patient_id, session_id, doc_type, file_path, raw_text),
    )

    entities = ocr_module.extract_entities(raw_text)
    for e in entities:
        db.execute(
            """
            INSERT INTO extracted_entities
                (document_id, entity_type, entity_name, value, unit, reference_range, is_abnormal)
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
        "raw_ocr_text": raw_text,
        "extracted_entities": entities,
    }), 201


@app.route("/api/documents/patient/<int:patient_id>", methods=["GET"])
def list_patient_documents(patient_id):
    docs = db.query(
        "SELECT * FROM documents WHERE patient_id=%s ORDER BY document_date, uploaded_at",
        (patient_id,),
    )
    return jsonify(docs)


# =====================================================================
# MODULE C — Structured History Summary Generator
# =====================================================================

@app.route("/api/summary/generate/<int:session_id>", methods=["POST"])
def generate_summary(session_id):
    """
    Step 4 - Summarize & Route. Builds and stores the structured summary.
    """
    try:
        structured, text = summary_generator.build_summary(session_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    return jsonify({"session_id": session_id, "summary_json": structured, "summary_text": text})


@app.route("/api/summary/<int:session_id>", methods=["GET"])
def get_summary(session_id):
    summary = db.query(
        "SELECT * FROM clinical_summaries WHERE session_id=%s", (session_id,), fetchone=True
    )
    if not summary:
        return jsonify({"error": "summary not yet generated"}), 404
    return jsonify(summary)


@app.route("/api/summary/<int:session_id>/confirm", methods=["POST"])
def confirm_summary(session_id):
    """
    Step 5 - Consult. Physician edits/confirms and (simulated) pushes to HIS + ABHA.
    Body JSON (optional): { edited_summary_text }
    """
    data = request.get_json(force=True, silent=True) or {}
    edited_text = data.get("edited_summary_text")

    if edited_text:
        db.execute(
            """
            UPDATE clinical_summaries
            SET summary_text=%s, physician_edited=TRUE, pushed_to_his=TRUE, abha_linked=TRUE
            WHERE session_id=%s
            """,
            (edited_text, session_id),
        )
    else:
        db.execute(
            """
            UPDATE clinical_summaries
            SET pushed_to_his=TRUE, abha_linked=TRUE
            WHERE session_id=%s
            """,
            (session_id,),
        )

    summary = db.query(
        "SELECT * FROM clinical_summaries WHERE session_id=%s", (session_id,), fetchone=True
    )
    return jsonify({"status": "confirmed_and_pushed", "summary": summary})


# =====================================================================
# Health check
# =====================================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "MediKiosk backend"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=Config.DEBUG)
