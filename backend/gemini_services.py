import os
from dotenv import load_dotenv
from google import genai

# Load environment variables from .env
load_dotenv()

# Initialize the client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_medical_advice(prompt_text):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_text,
        )
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None
