"""
history_engine.py
Module A - Conversational Multimodal History Engine (rule-based core).

This implements a deterministic, ontology-driven adaptive questioning tree
(SOCRATES framework for HPI + standard PMH/Drug/Family/Personal/ROS blocks +
an AYUSH Dashavidha Pariksha branch). It is intentionally rule-based so the
backend runs standalone with no external API key.

To upgrade to a full LLM-driven conversational engine, swap `get_next_question()`
and `record_answer()` internals to call an LLM (see the `llm_hook.py` stub) that
is grounded in the same `HISTORY_ONTOLOGY` structure, and use an ASR/TTS service
(e.g. Bhashini / AI4Bharat) upstream of `input_mode == 'voice'` answers.
"""

# ---------------------------------------------------------------------------
# Red-flag keyword list -> triggers priority triage (Module A: red-flag detection)
# ---------------------------------------------------------------------------
RED_FLAGS = {
    "chest pain": ["breathless", "sweating", "left arm", "radiat"],
    "headache": ["worst headache", "vision loss", "confusion", "stroke"],
    "abdominal pain": ["vomiting blood", "black stool", "rigid abdomen"],
    "breathlessness": ["blue lips", "cannot speak", "cyanosis"],
    "weakness": ["one side", "facial droop", "slurred speech"],
}

# ---------------------------------------------------------------------------
# SOCRATES-based HPI question tree, keyed by chief complaint category.
# In production this ontology would be much larger / clinician-curated.
# ---------------------------------------------------------------------------
SOCRATES_QUESTIONS = [
    {"code": "SOCRATES_SITE", "text": "Where exactly is the problem located?"},
    {"code": "SOCRATES_ONSET", "text": "When did it start, and did it come on suddenly or gradually?"},
    {"code": "SOCRATES_CHARACTER", "text": "How would you describe it (e.g. sharp, dull, burning, cramping)?"},
    {"code": "SOCRATES_RADIATION", "text": "Does it spread or move anywhere else?"},
    {"code": "SOCRATES_ASSOCIATED", "text": "Are there any other symptoms along with it?"},
    {"code": "SOCRATES_TIMING", "text": "Is it constant, or does it come and go?"},
    {"code": "SOCRATES_EXACERBATING", "text": "Does anything make it better or worse?"},
    {"code": "SOCRATES_SEVERITY", "text": "On a scale of 1-10, how severe is it?"},
]

PAST_MEDICAL_QUESTIONS = [
    {"code": "PMH_CHRONIC", "text": "Do you have any long-term illnesses (e.g. diabetes, hypertension, TB, asthma)?"},
    {"code": "PMH_SURGERY", "text": "Have you had any surgeries or hospital admissions in the past?"},
]

DRUG_ALLERGY_QUESTIONS = [
    {"code": "DRUG_CURRENT", "text": "Are you currently taking any medicines regularly?"},
    {"code": "ALLERGY", "text": "Are you allergic to any medicine, food, or substance?"},
]

FAMILY_QUESTIONS = [
    {"code": "FAMILY_HISTORY", "text": "Does anyone in your immediate family have diabetes, heart disease, cancer, or similar conditions?"},
]

PERSONAL_QUESTIONS = [
    {"code": "PERSONAL_HABITS", "text": "Do you smoke, drink alcohol, or use tobacco?"},
    {"code": "PERSONAL_DIET", "text": "How would you describe your diet and daily routine?"},
]

ROS_QUESTIONS = [
    {"code": "ROS_GENERAL", "text": "Any fever, weight loss, or loss of appetite recently?"},
    {"code": "ROS_SYSTEMS", "text": "Any problems with digestion, urination, sleep, or breathing?"},
]

# AYUSH / Ayurvedic Dashavidha Pariksha branch
AYUSH_QUESTIONS = [
    {"code": "AYUSH_PRAKRITI", "text": "How would you describe your body build and nature since childhood (thin/fast vs heavy/slow vs medium/active)?"},
    {"code": "AYUSH_AGNI", "text": "How is your digestion — do you feel hungry on time, and does food digest easily?"},
    {"code": "AYUSH_KOSHTHA", "text": "How is your bowel habit — regular, constipated, or loose?"},
    {"code": "AYUSH_SATMYA", "text": "Are there foods or climates that particularly suit or disagree with you?"},
    {"code": "AYUSH_SATTVA", "text": "How would you describe your mental resilience and sleep quality?"},
    {"code": "AYUSH_VYAYAMA_SHAKTI", "text": "How much physical activity/exercise can you comfortably do?"},
    {"code": "AYUSH_AHARA_VIHARA", "text": "Can you describe your typical daily diet and lifestyle (Ahara-Vihara)?"},
]

CATEGORY_ORDER = [
    ("HPI", SOCRATES_QUESTIONS),
    ("PAST_MEDICAL", PAST_MEDICAL_QUESTIONS),
    ("DRUG_ALLERGY", DRUG_ALLERGY_QUESTIONS),
    ("FAMILY", FAMILY_QUESTIONS),
    ("PERSONAL", PERSONAL_QUESTIONS),
    ("ROS", ROS_QUESTIONS),
]

AYUSH_CATEGORY_ORDER = CATEGORY_ORDER + [("AYUSH", AYUSH_QUESTIONS)]


def check_red_flag(chief_complaint: str, answer_text: str) -> bool:
    """Very simple keyword-based red-flag detector (Module A)."""
    cc = (chief_complaint or "").lower()
    ans = (answer_text or "").lower()
    for complaint_key, flags in RED_FLAGS.items():
        if complaint_key in cc:
            if any(flag in ans for flag in flags):
                return True
    return False


def get_question_plan(mode: str = "allopathic"):
    """Returns the ordered (category, [questions]) plan for a session mode."""
    return AYUSH_CATEGORY_ORDER if mode == "ayush" else CATEGORY_ORDER


def get_next_question(answered_codes: set, mode: str = "allopathic"):
    """
    Given the set of question_codes already answered in this session,
    return the next (category, question_dict) to ask, or None if the
    interview is complete.
    """
    plan = get_question_plan(mode)
    for category, questions in plan:
        for q in questions:
            if q["code"] not in answered_codes:
                return category, q
    return None, None
