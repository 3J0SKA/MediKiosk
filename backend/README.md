# MediKiosk Backend

A working Python (Flask) + MySQL backend implementing the core modules from
the problem statement:

- **Module A** — Adaptive conversational history engine (SOCRATES-based HPI +
  PMH/Drug/Family/Personal/ROS + AYUSH Dashavidha Pariksha branch + red-flag
  detection) — `history_engine.py`
- **Module B** — Document digitization: OCR + rule-based clinical entity
  extraction (medications, lab values, abnormal flagging) — `ocr_module.py`
- **Module C** — Structured, physician-ready summary generator (JSON + text) — `summary_generator.py`
- **Module D** — Patient identification/consent + a simulated HIS/ABHA push — `app.py` (`/api/summary/.../confirm`)

This is a **functional starting backend**, not the full production system —
it is built so it runs end-to-end today, with clearly marked seams for where
you'd plug in real ASR/TTS (Bhashini/AI4Bharat), an LLM for more natural
conversation, a production-grade clinical NLP model, and the real ABDM FHIR
APIs.

---

## 1. Software you need to install

| Software | Purpose | Notes |
|---|---|---|
| **Python 3.10+** | Runs the backend | [python.org/downloads](https://www.python.org/downloads/) |
| **MySQL Server 8.0+** | Database | [dev.mysql.com/downloads](https://dev.mysql.com/downloads/mysql/) — or use MySQL Workbench / XAMPP for a GUI |
| **Tesseract OCR** | Document digitization (Module B) | Windows: [UB-Mannheim build](https://github.com/UB-Mannheim/tesseract/wiki). Mac: `brew install tesseract`. Linux: `sudo apt install tesseract-ocr` |
| **pip** (comes with Python) | Installs Python packages | — |
| A REST client (optional) | Testing the API | Postman, Insomnia, or `curl` |

For Indian-language OCR/ASR beyond this baseline, you'd additionally install
language packs for Tesseract (`tesseract-ocr-hin`, etc.) or integrate the
Bhashini API — noted as an upgrade path below.

---

## 2. Setup steps

```bash
# 1. Unzip the project and enter it
cd medikiosk_backend

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Create the database
mysql -u root -p < schema.sql

# 5. Configure environment variables
cp .env.example .env
# then edit .env with your MySQL password and your Tesseract path

# 6. Run the server
python app.py
```

The API will be live at `http://localhost:5000/api`.

## 3. Test it end-to-end

With the server running in one terminal, in another terminal:

```bash
pip install requests
python test_flow.py
```

This script registers a patient, runs through an adaptive history interview
(including triggering a red-flag alert on "chest pain radiating to left arm,
sweating"), generates the structured summary, and confirms/pushes it —
printing the physician-ready summary to your console.

---

## 4. API reference (quick)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/patients/register` | POST | Register/lookup patient (Step 1 - Identify) |
| `/api/patients/<id>` | GET | Fetch patient record |
| `/api/history/start` | POST | Begin an OPD visit history session |
| `/api/history/answer` | POST | Submit an answer, get next adaptive question |
| `/api/history/session/<id>` | GET | View all Q&A for a session |
| `/api/documents/upload` | POST (multipart) | Upload/OCR a prescription/lab report/discharge summary |
| `/api/documents/patient/<id>` | GET | List a patient's digitized documents |
| `/api/summary/generate/<session_id>` | POST | Generate the structured clinical summary |
| `/api/summary/<session_id>` | GET | Fetch a stored summary |
| `/api/summary/<session_id>/confirm` | POST | Physician confirms/edits, simulated push to HIS/ABHA |
| `/api/health` | GET | Health check |

### Example: uploading a document (curl)

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "patient_id=1" \
  -F "doc_type=lab_report" \
  -F "file=@/path/to/lab_report.jpg"
```

---

## 5. Database schema

See `schema.sql`. Six tables: `patients`, `history_sessions`, `history_qa`,
`documents`, `extracted_entities`, `clinical_summaries` — matching Modules
A–D described in the problem statement, with foreign keys wired for
cascading cleanup.

---

## 6. Where to extend this toward the full vision

- **Voice input**: Wire `input_mode == 'voice'` answers through Bhashini /
  AI4Bharat ASR before they reach `/api/history/answer`; use their TTS to
  read `question_text` aloud on the kiosk frontend.
- **LLM-driven conversation**: Replace the rule-based `get_next_question()`
  in `history_engine.py` with a call to an LLM (e.g. via the Anthropic API)
  that is grounded in the same ontology, for more natural follow-up probing.
- **Clinical NLP**: Replace the regex extraction in `ocr_module.py` with a
  medical NER model for far more robust diagnosis/medication/lab extraction
  from handwritten Indian prescriptions.
- **ABDM/FHIR**: Replace the simulated "push to HIS/ABHA" in
  `/api/summary/<id>/confirm` with real calls to ABDM's Health Information
  Exchange and FHIR APIs, and add real ABHA ID authentication in
  `/api/patients/register`.
- **PDF OCR**: Current OCR handles image uploads directly; for PDF lab
  reports, render each page to an image first (e.g. with `pdf2image`, which
  needs `poppler` installed) before calling `ocr_module.run_ocr`.
- **Security**: Add JWT-based auth on all routes, encrypt `documents` at
  rest, and enforce DPDP Act 2023 consent/retention rules (e.g. a scheduled
  job clearing `uploads/` per the "session termination" requirement).

---

## 7. Project structure

```
medikiosk_backend/
├── app.py                 # Flask routes (the API)
├── db.py                  # MySQL connection pool helper
├── config.py               # Configuration (reads .env)
├── history_engine.py       # Module A - adaptive question engine
├── ocr_module.py            # Module B - OCR + entity extraction
├── summary_generator.py     # Module C - summary builder
├── schema.sql               # Module D-adjacent - full DB schema
├── requirements.txt
├── .env.example
├── test_flow.py             # End-to-end smoke test
└── uploads/                 # Uploaded documents land here
```
## Developer Setup

1. **Accept Model Access:**
   Visit [ai4bharat/indic-parler-tts](https://huggingface.co/ai4bharat/indic-parler-tts) and accept the terms.

2. **Configure Environment:**
   Copy `.env.example` to `.env` and insert your Hugging Face access token:
   ```env
   HF_TOKEN=hf_xxxx...