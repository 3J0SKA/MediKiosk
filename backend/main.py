from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS so the frontend can send requests to your server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin during hackathons
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],
)

class SymptomInput(BaseModel):
    symptoms: str

@app.get("/")
def read_root():
    return {"status": "MediKiosk backend running"}

@app.post("/api/kiosk-entry")
def process_kiosk_data(data: SymptomInput):
    # Place system logic or call the AI model functions here
    return {
        "status": "success",
        "received_symptoms": data.symptoms,
        "recommendation": "Proceed to Triage Counter 1"
    }





















