"""
config.py
Central configuration, loaded from environment variables (with sane local defaults).
Create a `.env` file in the project root (see .env.example) rather than hardcoding
secrets here.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # reads .env file if present


class Config:
    # ---- MySQL connection ----
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "medikiosk")

    # ---- File storage ----
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

    # ---- OCR engine ----
    TESSERACT_CMD = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")

    # ---- Flask ----
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"

    # ---- Auth ----
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXP_HOURS = 12

    # ---- External AI service ----
    HUATUO_API_KEY = os.getenv("HUATUO_API_KEY", "")
