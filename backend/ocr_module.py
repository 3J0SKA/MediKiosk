"""
ocr_module.py
Module B - Medical Document Digitization & Intelligence.

Uses Tesseract OCR (via pytesseract) to extract raw text from uploaded
prescriptions/lab reports, then applies lightweight regex-based clinical
entity extraction (diagnosis / medication / lab values with abnormal
flagging). This is a functional baseline; swap `extract_entities()` for a
clinical NLP model (e.g. a fine-tuned LLM or a medical NER model) for
production-grade accuracy on handwritten Indian prescriptions.
"""

import re
import pytesseract
from PIL import Image
from config import Config

pytesseract.pytesseract.tesseract_cmd = Config.TESSERACT_CMD

# Common lab tests with normal reference ranges (illustrative, not exhaustive)
LAB_REFERENCE_RANGES = {
    "hemoglobin": (12.0, 17.0, "g/dL"),
    "hb": (12.0, 17.0, "g/dL"),
    "fbs": (70, 110, "mg/dL"),
    "fasting blood sugar": (70, 110, "mg/dL"),
    "rbs": (70, 140, "mg/dL"),
    "tsh": (0.4, 4.0, "mIU/L"),
    "creatinine": (0.6, 1.3, "mg/dL"),
    "wbc": (4000, 11000, "/cumm"),
}

MEDICATION_PATTERN = re.compile(
    r"\b(tab|tablet|cap|capsule|syp|syrup|inj|injection)\.?\s+([A-Za-z][A-Za-z0-9\-]+)",
    re.IGNORECASE,
)

LAB_VALUE_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z \-]{2,30})[:\-]?\s+(\d+\.?\d*)\s*(mg/dL|g/dL|mIU/L|/cumm|%)?",
    re.IGNORECASE,
)


def run_ocr(file_path: str) -> str:
    """Extract raw text from an image file using Tesseract."""
    try:
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        return f"[OCR_ERROR] {e}"


def extract_entities(raw_text: str):
    """
    Very lightweight rule-based clinical entity extraction.
    Returns a list of dicts ready to insert into `extracted_entities`.
    """
    entities = []

    # --- medications ---
    for match in MEDICATION_PATTERN.finditer(raw_text):
        entities.append({
            "entity_type": "medication",
            "entity_name": match.group(2),
            "value": None,
            "unit": None,
            "reference_range": None,
            "is_abnormal": False,
        })

    # --- lab values ---
    for match in LAB_VALUE_PATTERN.finditer(raw_text):
        name_raw = match.group(1).strip().lower()
        value_str = match.group(2)
        unit = match.group(3)
        ref = LAB_REFERENCE_RANGES.get(name_raw)

        is_abnormal = False
        ref_range_str = None
        if ref:
            low, high, expected_unit = ref
            ref_range_str = f"{low}-{high} {expected_unit}"
            try:
                value = float(value_str)
                is_abnormal = value < low or value > high
            except ValueError:
                pass

        entities.append({
            "entity_type": "lab_value",
            "entity_name": name_raw,
            "value": value_str,
            "unit": unit or (ref[2] if ref else None),
            "reference_range": ref_range_str,
            "is_abnormal": is_abnormal,
        })

    return entities
