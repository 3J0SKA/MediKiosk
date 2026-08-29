"""
test_flow.py
A simple end-to-end smoke test that walks through the full patient journey
against a running local server (python app.py). Run with:

    python test_flow.py

Requires `requests` (pip install requests). Does NOT require Tesseract to be
installed if you skip the document upload step.
"""

import requests

BASE = "http://localhost:5000/api"


def main():
    # 1. Register patient
    r = requests.post(f"{BASE}/patients/register", json={
        "full_name": "Ramesh Kumar",
        "age": 45,
        "gender": "M",
        "phone": "9876543210",
        "preferred_lang": "hi",
        "department": "General Medicine",
        "consent_given": True,
    })
    patient = r.json()["patient"]
    patient_id = patient["patient_id"]
    print("Registered patient:", patient_id)

    # 2. Start history session
    r = requests.post(f"{BASE}/history/start", json={
        "patient_id": patient_id,
        "chief_complaint": "chest pain",
        "mode": "allopathic",
    })
    data = r.json()
    session_id = data["session_id"]
    next_q = data["next_question"]
    print("Started session:", session_id, "First question:", next_q["text"])

    # 3. Answer questions in a loop until interview_complete
    # (simulate a patient reporting a worrying "chest pain" answer to trigger a red flag)
    answer_map_first = "sudden onset, radiating to left arm, sweating a lot"
    answer_text = answer_map_first
    while next_q:
        r = requests.post(f"{BASE}/history/answer", json={
            "session_id": session_id,
            "category": next_q["category"],
            "question_code": next_q["code"],
            "question_text": next_q["text"],
            "answer_text": answer_text,
            "input_mode": "voice",
        })
        result = r.json()
        if result.get("red_flag_triggered"):
            print("  !! RED FLAG TRIGGERED on:", next_q["text"])
        next_q = result["next_question"]
        answer_text = "no" if next_q else None  # generic answer for remaining questions
        if next_q:
            print("  Next question:", next_q["text"])

    print("Interview complete.")

    # 4. Generate summary
    r = requests.post(f"{BASE}/summary/generate/{session_id}")
    summary = r.json()
    print("\n--- GENERATED SUMMARY ---\n")
    print(summary["summary_text"])

    # 5. Confirm summary (simulated physician action)
    r = requests.post(f"{BASE}/summary/{session_id}/confirm", json={})
    print("\nConfirm status:", r.json()["status"])


if __name__ == "__main__":
    main()
