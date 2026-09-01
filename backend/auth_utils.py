"""
auth_utils.py
Mock ABHA/Aadhaar authentication. Issues a signed JWT after OTP
verification, and provides a decorator to protect routes so a patient
can only ever access their own data.

MOCK NOTE: OTP is hardcoded to "123456" for demo purposes. In
production this would be replaced with a real ABDM/Aadhaar OTP flow.
"""

import jwt
import datetime
from functools import wraps
from flask import request, jsonify, g
from config import Config

MOCK_OTP = "123456"


def generate_token(patient_id: int, abha_id: str) -> str:
    payload = {
        "patient_id": patient_id,
        "abha_id": abha_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXP_HOURS),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def decode_token(token: str):
    return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])


def require_auth(f):
    """Attach g.patient_id / g.abha_id from a valid Bearer token, or 401."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid token"}), 401

        g.patient_id = payload["patient_id"]
        g.abha_id = payload["abha_id"]
        return f(*args, **kwargs)
    return wrapper


def owns_patient(patient_id) -> bool:
    """True if the authenticated token belongs to this exact patient_id."""
    return g.get("patient_id") == int(patient_id)