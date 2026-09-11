"""
report_synthesizer.py
Sends the raw AI-intake chat summary + raw document summary to Gemini,
and gets back a single structured clinical summary object that the PDF
renderer turns into a properly formatted document.
"""

import json
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)

SYNTHESIS_PROMPT = """
You are preparing a physician-ready clinical intake summary for a doctor
who has not yet seen this patient. You are given two raw inputs:

1. RAW AI INTAKE CHAT — a conversation where the patient described their
   symptoms to an AI assistant.
2. RAW DOCUMENT SUMMARY — extracted data from the patient's old
   prescriptions, lab reports, or discharge summaries.

Synthesize these into ONE structured clinical summary. Do not invent
information that isn't present in the inputs. If a section has no
relevant information, use an empty list or null rather than guessing.

Return ONLY valid JSON in this exact shape:
{
  "chief_complaint": string or null,
  "history_of_present_illness": string or null,
  "symptoms": [string],
  "onset_duration": string or null,
  "severity": string or null,
  "current_medications": [
    {"name": string, "dosage": string or null, "frequency": string or null}
  ],
  "past_medical_history": [string],
  "abnormal_lab_findings": [
    {"test_name": string, "value": string, "reference_range": string or null}
  ],
  "allergies": [string],
  "red_flags": [string],
  "physician_notes": string or null
}

RAW AI INTAKE CHAT:
{ai_summary}

RAW DOCUMENT SUMMARY:
{doc_summary}
"""


def synthesize_structured_summary(ai_summary: str, doc_summary: str) -> dict:
    """Returns a structured dict per the schema above.
    Raises RuntimeError on failure — caller should fall back to raw text."""
    prompt = SYNTHESIS_PROMPT.replace(
        "{ai_summary}", ai_summary or "No AI intake conversation recorded."
    ).replace(
        "{doc_summary}", doc_summary or "No documents uploaded."
    )
    try:
        model = genai.GenerativeModel(Config.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return json.loads(response.text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Gemini returned non-JSON output: {e}")
    except Exception as e:
        raise RuntimeError(f"Gemini synthesis failed: {e}")

def compute_priority(structured: dict) -> str:
    """Simple, transparent priority rule — not a clinical triage algorithm,
    just a visibility signal for the physician queue."""
    if structured.get("red_flags"):
        return "high"
    if structured.get("abnormal_lab_findings"):
        return "medium"
    return "low"