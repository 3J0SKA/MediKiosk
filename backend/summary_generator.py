"""
summary_generator.py
Module C - Structured History Summary Generator.

Synthesizes the conversational history (history_qa rows) and digitized
document entities (extracted_entities rows) into one physician-ready
structured summary (CC -> HPI -> PMH -> Drug/Allergy -> Family -> Personal
-> ROS -> Prior investigations), stored as both JSON and rendered text.
"""

import json
import db


def _group_qa_by_category(qa_rows):
    grouped = {}
    for row in qa_rows:
        grouped.setdefault(row["category"], []).append(row)
    return grouped


def build_summary(session_id: int):
    session = db.query(
        "SELECT * FROM history_sessions WHERE session_id=%s", (session_id,), fetchone=True
    )
    if not session:
        raise ValueError("Session not found")

    patient = db.query(
        "SELECT * FROM patients WHERE patient_id=%s", (session["patient_id"],), fetchone=True
    )

    qa_rows = db.query(
        "SELECT * FROM history_qa WHERE session_id=%s ORDER BY qa_id", (session_id,)
    )
    grouped = _group_qa_by_category(qa_rows)

    documents = db.query(
        "SELECT * FROM documents WHERE session_id=%s OR patient_id=%s ORDER BY document_date",
        (session_id, session["patient_id"]),
    )
    doc_ids = [d["document_id"] for d in documents]
    entities = []
    if doc_ids:
        fmt = ",".join(["%s"] * len(doc_ids))
        entities = db.query(
            f"SELECT * FROM extracted_entities WHERE document_id IN ({fmt})", tuple(doc_ids)
        )

    diagnoses = [e["entity_name"] for e in entities if e["entity_type"] == "diagnosis"]
    medications = [e["entity_name"] for e in entities if e["entity_type"] == "medication"]
    abnormal_labs = [e for e in entities if e["entity_type"] == "lab_value" and e["is_abnormal"]]

    structured = {
        "patient_name": patient["full_name"],
        "age": patient["age"],
        "gender": patient["gender"],
        "chief_complaint": session["chief_complaint"],
        "history_of_present_illness": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("HPI", [])
        ],
        "past_medical_surgical_history": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("PAST_MEDICAL", [])
        ],
        "drug_allergy_history": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("DRUG_ALLERGY", [])
        ],
        "family_history": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("FAMILY", [])
        ],
        "personal_history": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("PERSONAL", [])
        ],
        "review_of_systems": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("ROS", [])
        ],
        "ayush_dashavidha_pariksha": [
            {"question": r["question_text"], "answer": r["answer_text"]}
            for r in grouped.get("AYUSH", [])
        ],
        "prior_investigations_summary": {
            "diagnoses_from_records": diagnoses,
            "medications_from_records": medications,
            "abnormal_lab_values": [
                {
                    "test": e["entity_name"],
                    "value": e["value"],
                    "unit": e["unit"],
                    "reference_range": e["reference_range"],
                }
                for e in abnormal_labs
            ],
        },
        "red_flags_raised": [r["question_text"] for r in qa_rows if r["is_red_flag"]],
    }

    text = _render_text(structured)

    db.execute(
        """
        INSERT INTO clinical_summaries (session_id, summary_json, summary_text)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE summary_json=%s, summary_text=%s
        """,
        (session_id, json.dumps(structured), text, json.dumps(structured), text),
    )

    db.execute(
        "UPDATE history_sessions SET status='completed', completed_at=NOW() WHERE session_id=%s",
        (session_id,),
    )

    return structured, text


def _render_text(s: dict) -> str:
    def fmt_block(title, items):
        if not items:
            return f"{title}: Not elicited / not applicable.\n"
        lines = "\n".join(f"  - {i['question']} -> {i['answer']}" for i in items)
        return f"{title}:\n{lines}\n"

    parts = [
        f"PATIENT: {s['patient_name']}  |  Age/Sex: {s['age']}/{s['gender']}",
        f"CHIEF COMPLAINT: {s['chief_complaint']}",
        "",
        fmt_block("HISTORY OF PRESENT ILLNESS", s["history_of_present_illness"]),
        fmt_block("PAST MEDICAL / SURGICAL HISTORY", s["past_medical_surgical_history"]),
        fmt_block("DRUG & ALLERGY HISTORY", s["drug_allergy_history"]),
        fmt_block("FAMILY HISTORY", s["family_history"]),
        fmt_block("PERSONAL HISTORY", s["personal_history"]),
        fmt_block("REVIEW OF SYSTEMS", s["review_of_systems"]),
    ]

    if s["ayush_dashavidha_pariksha"]:
        parts.append(fmt_block("AYUSH - DASHAVIDHA PARIKSHA", s["ayush_dashavidha_pariksha"]))

    inv = s["prior_investigations_summary"]
    parts.append("PRIOR INVESTIGATIONS SUMMARY:")
    parts.append(f"  Diagnoses on record: {', '.join(inv['diagnoses_from_records']) or 'None'}")
    parts.append(f"  Medications on record: {', '.join(inv['medications_from_records']) or 'None'}")
    if inv["abnormal_lab_values"]:
        parts.append("  Abnormal lab values:")
        for lab in inv["abnormal_lab_values"]:
            parts.append(f"    * {lab['test']}: {lab['value']} {lab['unit'] or ''} (ref: {lab['reference_range']})")
    else:
        parts.append("  Abnormal lab values: None detected")

    if s["red_flags_raised"]:
        parts.append("\n*** RED FLAGS RAISED - PRIORITY TRIAGE RECOMMENDED ***")
        for rf in s["red_flags_raised"]:
            parts.append(f"  ! {rf}")

    return "\n".join(parts)
