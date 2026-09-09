"""
gemini_services.py
Backs the MediKiosk chat widget. Keeps one multi-turn Gemini chat session
per session_id so the assistant remembers earlier turns in the same
conversation, and applies a system instruction so it stays in scope for
a hospital-waiting-room assistant rather than acting as a diagnostic tool.
"""

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.5-flash")

SYSTEM_INSTRUCTION = """You are the MediKiosk assistant, helping patients in a hospital \
waiting area understand general health information and how to use this kiosk. \
You are NOT a diagnostic tool. Always recommend seeing the on-site physician for \
anything specific to the patient's symptoms, medications, or test results. Keep \
answers short and simple — this is read on a kiosk screen or via voice."""

# In-memory session store: {session_id: chat_object}
# Fine for a single-process dev/demo deploy. If you scale the Flask app to
# multiple workers/instances, move this to Redis (or similar) since each
# worker would otherwise have its own separate dict.
_sessions: dict[str, "genai.chats.Chat"] = {}


def get_chat_response(session_id: str, message: str) -> str:
    """Sends `message` on the chat session for `session_id`, creating a new
    session (with the system instruction applied) on first use, and returns
    the model's reply text. Raises on any Gemini/network failure — the
    caller (app.py) is expected to catch and turn it into a clean HTTP error.
    """
    chat = _sessions.get(session_id)

    if chat is None:
        chat = client.chats.create(
            model=CHAT_MODEL,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                max_output_tokens=512,
            ),
        )
        _sessions[session_id] = chat

    response = chat.send_message(message)
    return response.text


def get_medical_advice(prompt_text: str) -> str | None:
    """Kept for backward compatibility with any existing single-shot callers.
    Prefer get_chat_response() for the chat widget — this has no memory
    between calls."""
    try:
        response = client.models.generate_content(
            model=CHAT_MODEL,
            contents=prompt_text,
        )
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None