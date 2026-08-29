-- =====================================================================
-- MediKiosk :: Database Schema
-- AI-Powered Clinical History & Document Digitization Platform
-- =====================================================================

CREATE DATABASE IF NOT EXISTS medikiosk
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE medikiosk;

-- ---------------------------------------------------------------------
-- 1. PATIENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    patient_id      INT AUTO_INCREMENT PRIMARY KEY,
    abha_id         VARCHAR(20)  UNIQUE,           -- Ayushman Bharat Health Account
    full_name       VARCHAR(150) NOT NULL,
    age             INT,
    gender          ENUM('M','F','O') DEFAULT 'O',
    phone           VARCHAR(15),
    preferred_lang  VARCHAR(10) DEFAULT 'en',       -- e.g. 'hi','en','ta','AYUSH'
    department      VARCHAR(100),                   -- OPD department selected at kiosk
    consent_given   BOOLEAN DEFAULT FALSE,
    consent_time    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. HISTORY SESSIONS  (one per OPD visit)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS history_sessions (
    session_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      INT NOT NULL,
    chief_complaint VARCHAR(255),
    mode            ENUM('allopathic','ayush') DEFAULT 'allopathic',
    status          ENUM('in_progress','completed','flagged_emergency') DEFAULT 'in_progress',
    started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. HISTORY Q&A  (every question the engine asked + the answer given)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS history_qa (
    qa_id           INT AUTO_INCREMENT PRIMARY KEY,
    session_id      INT NOT NULL,
    category        VARCHAR(50),      -- HPI, PAST_MEDICAL, DRUG_ALLERGY, FAMILY, PERSONAL, ROS, AYUSH
    question_code   VARCHAR(50),      -- e.g. SOCRATES_ONSET, SOCRATES_SITE
    question_text   VARCHAR(500),
    answer_text     VARCHAR(1000),
    input_mode      ENUM('voice','touch') DEFAULT 'touch',
    is_red_flag     BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES history_sessions(session_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 4. DOCUMENTS  (uploaded/scanned prescriptions, labs, discharge summaries)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    document_id     INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      INT NOT NULL,
    session_id      INT,
    doc_type        ENUM('prescription','lab_report','discharge_summary','imaging','other') DEFAULT 'other',
    file_path       VARCHAR(500) NOT NULL,
    raw_ocr_text    TEXT,
    document_date   DATE,                 -- extracted / inferred date for chronological ordering
    uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES history_sessions(session_id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 5. EXTRACTED ENTITIES  (structured data pulled out of documents by OCR/NLP)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extracted_entities (
    entity_id       INT AUTO_INCREMENT PRIMARY KEY,
    document_id     INT NOT NULL,
    entity_type     ENUM('diagnosis','medication','lab_value','procedure') NOT NULL,
    entity_name     VARCHAR(255),
    value           VARCHAR(100),      -- e.g. lab result value
    unit            VARCHAR(50),
    reference_range VARCHAR(50),
    is_abnormal     BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 6. CLINICAL SUMMARIES  (final physician-ready generated summary)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_summaries (
    summary_id      INT AUTO_INCREMENT PRIMARY KEY,
    session_id      INT NOT NULL UNIQUE,
    summary_json    JSON,             -- structured CC/HPI/PMH/Drug/Family/Personal/ROS
    summary_text    TEXT,             -- human-readable rendered version
    physician_edited BOOLEAN DEFAULT FALSE,
    pushed_to_his   BOOLEAN DEFAULT FALSE,
    abha_linked     BOOLEAN DEFAULT FALSE,
    generated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES history_sessions(session_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------
CREATE INDEX idx_history_qa_session ON history_qa(session_id);
CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_entities_document ON extracted_entities(document_id);
