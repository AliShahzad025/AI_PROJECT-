from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class AIRequest(BaseModel):
    prompt: str

@router.post("/generate")
def generate_questions(req: AIRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured on server. Please add GEMINI_API_KEY to your .env file.")

    try:
        # Use Gemini Flash Latest
        model = genai.GenerativeModel('gemini-flash-latest')
        
        response = model.generate_content(req.prompt)
        
        if not response.text:
            raise HTTPException(status_code=500, detail="Gemini returned an empty response.")
            
        # Returning in a structure compatible with the frontend
        return {"content": [{"text": response.text}]}
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
