# \# MediKiosk

# 

# \*\*Two minutes with the doctor deserves ten minutes of listening first.\*\*

# 

# In an Indian government hospital OPD, a doctor often gets two to five minutes per patient. In that window they're supposed to take a history, examine, read the crumpled prescription from three visits ago, decide, and counsel. Something has to give, and it's usually the history.

# 

# MediKiosk moves the history-taking out of the consultation room. The patient sits at a kiosk before they see the doctor, talks (or taps) through their symptoms in their own language, photographs their old prescriptions and lab reports, and walks in with a structured summary already waiting on the doctor's screen.

# 

# It doesn't diagnose anything. It listens, organises, and flags what looks urgent. The doctor still does the doctoring.

# 

# Built for Smart India Hackathon.

# 

# <!-- Add team names, photo, and a demo video link here before the final submission -->

# 

# \---

# 

# \## What a patient actually does

# 

# 1\. \*\*Language first.\*\* Before anything else, pick English, Hindi, Punjabi, Tamil, or Bengali. The whole app switches, fonts included.

# 2\. \*\*Log in with an ID, not a password.\*\* Aadhaar/ABHA-style ID plus an OTP. New patients register inline, in the same flow.

# 3\. \*\*Say yes to consent.\*\* It's read aloud on request, and nothing else unlocks until it's ticked.

# 4\. \*\*Talk to the intake assistant.\*\* Type, or tap the mic and speak. The assistant asks one gentle follow-up at a time (where, since when, how bad) and talks back in the same language.

# 5\. \*\*Upload old paperwork.\*\* Prescriptions, lab reports, discharge summaries. JPG, PNG, or PDF.

# 6\. \*\*Hit summarise.\*\* Gemini reads the documents, handwriting included, and pulls out medications, lab values, and anything abnormal.

# 7\. \*\*Generate the PDF.\*\* The chat and the documents get merged into one structured clinical summary, rendered as a PDF in the site's colours.

# 8\. \*\*The doctor sees it.\*\* The patient appears in the physician dashboard with a priority tag and the full summary, along with every document they uploaded.

# 

# If someone is having an actual emergency, there's a red strip at the top of the home screen that alerts staff without making them sit through any of the above.

# 

# \---

# 

# \## How it fits together

# 

# ```mermaid

# flowchart LR

# &#x20;   Patient\["Patient at kiosk"] --> FE\["Next.js frontend"]

# &#x20;   Doctor\["Doctor"] --> FE

# &#x20;   FE -->|"JWT"| API\["Flask API"]

# &#x20;   API --> DB\[("MySQL")]

# &#x20;   API --> Disk\["uploads/ on local disk"]

# &#x20;   API --> Gemini\["Gemini (chat, document reading, synthesis)"]

# &#x20;   API --> TTS\["Indic Parler-TTS on local GPU"]

# &#x20;   API --> PDF\["ReportLab PDF"]

# ```

# 

# \*\*Frontend\*\* is Next.js (App Router) with TypeScript and Tailwind. There's no i18n library; the five languages live in plain dictionaries, which turned out to be easier to reason about than we expected.

# 

# \*\*Backend\*\* is Flask with a MySQL connection pool. Every patient route checks a signed token and then checks that the token's owner is the patient being asked about, so knowing someone else's ID gets you a 403, not their data.

# 

# \*\*The AI does three separate jobs:\*\*

# 

# | Job | Model | What it produces |

# |---|---|---|

# | Intake chat | Gemini Flash | A short, kind reply and one follow-up question, in the patient's language |

# | Document reading | Gemini Flash (multimodal) | Structured JSON per document, with a confidence level on each field and a `needs\_review` flag when it's unsure |

# | Final synthesis | Gemini Flash | One clinical summary built from the chat and all documents together |

# 

# \*\*The voice\*\* is AI4Bharat's Indic Parler-TTS, self-hosted on our own GPU. We wanted spoken replies in Punjabi and Tamil that sound like Punjabi and Tamil, and we didn't want patient speech going to a third party. If the backend voice isn't available, the tour narration falls back to the browser's built-in speech.

# 

# \*\*Priority\*\* in the doctor's queue is deliberately plain: any red flag means high, any abnormal lab value means medium, everything else is low. It's a way to sort a list, not a triage algorithm, and we'd rather say so than dress it up.

# 

# \---

# 

# \## Run it locally

# 

# You'll need: \*\*Python 3.12\*\*, \*\*Node 20+\*\*, \*\*pnpm\*\*, \*\*MySQL 8\*\*, and \*\*Tesseract OCR\*\*. A CUDA GPU is nice for the voice model but not required (CPU works, it's just slow).

# 

# > Python 3.12 specifically. On 3.14 the PyTorch and `greenlet` wheels didn't exist yet and the install fell over.

# 

# \### Backend

# 

# ```bash

# cd backend

# python -m venv venv

# venv\\Scripts\\activate            # macOS/Linux: source venv/bin/activate

# pip install -r requirements.txt

# ```

# 

# Create the database and load the schema:

# 

# ```bash

# mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS medikiosk;"

# mysql -u root -p medikiosk < schema.sql

# ```

# 

# Two tables the document and report features need aren't in `schema.sql` yet. Run these too:

# 

# ```sql

# CREATE TABLE IF NOT EXISTS ai\_extractions (

# &#x20;   extraction\_id INT AUTO\_INCREMENT PRIMARY KEY,

# &#x20;   document\_id   INT NOT NULL UNIQUE,

# &#x20;   model\_used    VARCHAR(100),

# &#x20;   result\_json   JSON NOT NULL,

# &#x20;   needs\_review  BOOLEAN DEFAULT FALSE,

# &#x20;   created\_at    DATETIME DEFAULT CURRENT\_TIMESTAMP,

# &#x20;   FOREIGN KEY (document\_id) REFERENCES documents(document\_id) ON DELETE CASCADE

# );

# 

# CREATE TABLE IF NOT EXISTS final\_summaries (

# &#x20;   summary\_id      INT AUTO\_INCREMENT PRIMARY KEY,

# &#x20;   patient\_id      INT NOT NULL UNIQUE,

# &#x20;   chief\_complaint VARCHAR(255),

# &#x20;   priority        ENUM('high','medium','low') DEFAULT 'low',

# &#x20;   structured\_json JSON NOT NULL,

# &#x20;   ai\_summary\_raw  TEXT,

# &#x20;   doc\_summary\_raw TEXT,

# &#x20;   created\_at      DATETIME DEFAULT CURRENT\_TIMESTAMP,

# &#x20;   updated\_at      DATETIME DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,

# &#x20;   FOREIGN KEY (patient\_id) REFERENCES patients(patient\_id) ON DELETE CASCADE

# );

# ```

# 

# Copy `.env.example` to `.env` and fill it in:

# 

# | Variable | What it's for |

# |---|---|

# | `MYSQL\_HOST`, `MYSQL\_PORT`, `MYSQL\_USER`, `MYSQL\_PASSWORD`, `MYSQL\_DB` | Database connection |

# | `JWT\_SECRET` | Signs login tokens. Make it long and random |

# | `GEMINI\_API\_KEY` | Free key from Google AI Studio |

# | `HF\_TOKEN` | Hugging Face token. Accept the terms on the \[indic-parler-tts](https://huggingface.co/ai4bharat/indic-parler-tts) page first |

# | `TESSERACT\_CMD` | Path to the Tesseract executable |

# 

# Then:

# 

# ```bash

# python app.py

# ```

# 

# The first start downloads the voice model (a few GB) and loads it before the server comes up, so give it a minute. The API lives at `http://localhost:5000/api`, and `/api/health` is the quick sanity check.

# 

# \### Frontend

# 

# ```bash

# cd frontend

# pnpm install

# ```

# 

# Create `frontend/.env.local`:

# 

# ```

# NEXT\_PUBLIC\_BACKEND\_URL=http://localhost:5000

# ```

# 

# ```bash

# pnpm dev

# ```

# 

# Open `http://localhost:3000`.

# 

# > We use pnpm because npm kept failing to install Tailwind's native Windows binary. If you're on npm and see a `Cannot find native binding` error, that's what this is.

# 

# \### Demo logins

# 

# | Who | How |

# |---|---|

# | Patient | Any ID of 6+ digits at `/patient-login`. OTP is always `123456`. An unknown ID takes you to registration |

# | Doctor | License ID `12-345-678` at `/physician-login`, then any 4-digit OTP |

# 

# \---

# 

# \## Pages

# 

# | Route | What's there |

# |---|---|

# | `/` | Language picker, then the landing page |

# | `/patient-login` | ID, OTP, inline registration |

# | `/patient-home` | Consent, department choice (General or AYUSH), emergency alert, audio tour, final PDF |

# | `/patient-intake` | The AI chat, with mic input and spoken replies |

# | `/document-upload` | Drag-and-drop upload with a progress bar, view, delete, summarise all |

# | `/document-summary` | Combined view of everything extracted: timeline, abnormal labs, medications |

# | `/patient-summary` | Preview of the chat summary |

# | `/physician-login`, `/physician-dashboard` | Doctor's queue, priority tags, summaries, document viewer |

# 

# \---

# 

# \## The API, briefly

# 

# | Area | Routes |

# |---|---|

# | Auth | `POST /api/auth/request-otp`, `POST /api/auth/verify-otp` |

# | Chat | `POST /api/chat/intake`, `POST /api/intake/complete` |

# | Documents | `POST /api/documents/upload`, `GET /api/documents/patient/<id>`, `POST .../summarize-all`, `GET .../combined-summary`, `DELETE .../clear-all`, `GET /api/documents/<id>/file`, `DELETE /api/documents/<id>` |

# | Report | `POST /api/report/generate-pdf` |

# | Doctor | `GET /api/physician/patients`, `GET /api/physician/patients/<id>`, `GET /api/physician/documents/<id>/file` |

# 

# \---

# 

# \## What we did about security

# 

# \- Signed JWTs, 12-hour expiry, ownership checked on every patient route

# \- Rate limits: 200/hour and 1000/day overall, 5 per minute on the OTP routes, 5 per hour on document summarising

# \- Uploads must match their extension by file signature, not just by name. Max 16 MB each, 30 documents per patient

# \- Stored filenames are generated UUIDs. The original name is never trusted for a path

# \- Files are only ever served through an authenticated route, never as static assets

# \- Kiosk sessions end after 5 idle minutes, with a 30-second warning first

# \- Patients can wipe all their uploaded documents and extracted data in one click

# 

# \---

# 

# \## Mocked, and rough edges

# 

# Judges and teammates will ask, so here it is straight.

# 

# \*\*Mocked on purpose:\*\*

# \- Aadhaar/ABHA verification. The OTP is hardcoded and nothing talks to ABDM

# \- The doctor login. It's a frontend check, and the `/api/physician/\*` routes have \*\*no authentication\*\*. That's fine for a demo and absolutely not fine for a real hospital

# \- The "push to HIS / ABHA" step after a doctor confirms a summary is simulated

# 

# \*\*Known rough edges:\*\*

# \- The priority rule is a simple heuristic, as described above

# \- Drug-interaction checking is only a flag that says "several medications found, please review". It doesn't consult an interaction database

# \- Handwriting reading is good, not perfect. That's what the confidence flags and `needs\_review` are for, and the PDF is labelled a draft for physician review

# \- `/patient-intake` still has the backend URL hardcoded instead of reading the env variable

# \- Data is meant to be cleared after a visit, but today that's a button the patient presses, not an automatic job

# \- The backend runs on Flask's dev server. Production needs a real WSGI setup and somewhere to host the GPU piece

# 

# \---

# 

# \## Things that went wrong on the way

# 

# Kept here partly as a warning and partly because they're funny now.

# 

# \- Python 3.14 broke the install, so the whole backend moved to 3.12

# \- npm silently skipped Tailwind's native binary on Windows. pnpm fixed it

# \- MySQL installed without a Windows service, then lost its root password twice

# \- A `.format()` call choked on the curly braces of its own JSON example, and Gemini never even got asked

# \- A "Final Medical Summary" button spent a while talking to a route that didn't exist yet

# 

# \---

# 

# \## Where it could go next

# 

# Real ABDM / ABHA integration, proper doctor authentication, a medical interaction database, streaming voice input in the chat instead of browser speech recognition, and auto-expiring patient data.

# 

# \---

# 

# \## Stack

# 

# Next.js · TypeScript · Tailwind CSS · Flask · MySQL · Google Gemini · AI4Bharat Indic Parler-TTS · Tesseract · ReportLab · PyJWT · Flask-Limiter · Vercel

# 

# \---

# 

# MediKiosk is a hackathon prototype. It is not a medical device, it does not diagnose, and it should not be used with real patient data in its current state.

