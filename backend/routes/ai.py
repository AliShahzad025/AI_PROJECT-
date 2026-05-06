from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class AIRequest(BaseModel):
    prompt: str

@router.post("/generate")
def generate_questions(req: AIRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        # Fallback to a mock or error
        raise HTTPException(status_code=500, detail="Anthropic API Key not configured on server")

    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-3-5-sonnet-20240620",
                "max_tokens": 2000,
                "messages": [{"role": "user", "content": req.prompt}]
            }
        )
        
        if response.status_code != 200:
            print(f"Anthropic error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.json().get("error", {}).get("message", "AI Generation Failed"))
            
        data = response.json()
        return {"content": data["content"][0]["text"]}
    except Exception as e:
        print(f"AI Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
