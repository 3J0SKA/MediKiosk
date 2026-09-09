"""
gemini_service.py
Reads a prescription/lab report/discharge summary (image or PDF) using
Gemini's multimodal input, and returns structured JSON. Doc-type-aware
prompting, with explicit confidence/needs-review flagging since
handwritten prescriptions are inherently ambiguous.
"""

import json
import mimetypes
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)

PROMPTS = {
    "prescription": """
You are reading a medical prescription, which may be handwritten and
messy. Use medical knowledge to make your best reading of unclear
handwriting (e.g. matching against real drug names), but never invent
information that isn't plausibly present.

Return ONLY valid JSON in this exact shape:
{
  "medications": [
    {"name": string, "dosage": string, "frequency": string, "duration": string, "confidence": "high"|"medium"|"low"}
  ],
  "doctor_name": string or null,
  "date": string or null,
  "notes": string or null,
  "needs_review": boolean,
  "review_reason": string or null
}
Set "needs_review": true if ANY field has "low" confidence or the
handwriting is largely illegible.
""",
    "lab_report": """
You are reading a lab/diagnostic report. Return ONLY valid JSON:
{
  "tests": [
    {"test_name": string, "value": string, "unit": string or null,
     "reference_range": string or null, "is_abnormal": boolean, "confidence": "high"|"medium"|"low"}
  ],
  "lab_name": string or null,
  "date": string or null,
  "needs_review": boolean,
  "review_reason": string or null
}
""",
    "discharge_summary": """
You are reading a hospital discharge summary. Return ONLY valid JSON:
{
  "diagnosis": string or null,
  "procedures": [string],
  "medications_on_discharge": [string],
  "follow_up_instructions": string or null,
  "date": string or null,
  "needs_review": boolean,
  "review_reason": string or null
}
""",
    "other": """
You are reading a medical document of unspecified type. Return ONLY
valid JSON:
{
  "document_summary": string,
  "key_facts": [string],
  "date": string or null,
  "needs_review": boolean,
  "review_reason": string or null
}
""",
}


def extract_from_document(file_path: str, doc_type: str) -> dict:
    """Sends the file to Gemini and returns parsed structured JSON.
    Raises RuntimeError on any failure (caller should surface a clean error)."""
    prompt = PROMPTS.get(doc_type, PROMPTS["other"])
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "application/pdf" if file_path.lower().endswith(".pdf") else "image/jpeg"

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        model = genai.GenerativeModel(Config.GEMINI_MODEL)
        response = model.generate_content(
            [
                {"mime_type": mime_type, "data": file_bytes},
                prompt,
            ],
            generation_config={"response_mime_type": "application/json"},
        )

        result = json.loads(response.text)
        return result

    except json.JSONDecodeError as e:
        raise RuntimeError(f"Gemini returned non-JSON output: {e}")
    except Exception as e:
        raise RuntimeError(f"Gemini extraction failed: {e}")