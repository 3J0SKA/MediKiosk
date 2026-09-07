# backend/gemini_services.py
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
# Fine for a hackathon demo; swap for Redis if you need multi-worker deploy.
_sessions: dict[str, "genai.chats.Chat"] = {}


def get_chat_response(session_id: str, message: str) -> str:
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
