import io
import base64
from fastapi import FastAPI, File, UploadFile, HTTPException, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional

from modules.resume_parser import parse_resume
from modules.ollama_interviewer import OllamaInterviewer
import json

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # Important for accessing custom headers in frontend
)

interviewer = None

@app.on_event("startup")
async def startup_event():
    global interviewer
    interviewer = OllamaInterviewer(model="mistral")

# --- API Endpoints ---

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Parse uploaded resume"""
    try:
        content = await file.read()
        parsed_data = parse_resume(content)
        print("Parsed resume data:", json.dumps(parsed_data, indent=2))
        return parsed_data
    except Exception as e:
        print(f"Error in upload_resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start-interview")
async def start_interview(resume_data: dict = Body(...)):
    """Start an interview session with the first question"""
    if not interviewer:
        raise HTTPException(status_code=500, detail="Interviewer not initialized")
    
    try:
        # Filter resume data to required fields
        interview_context = {
            "technical_skills": resume_data.get("technical_skills", []),
            "experience": resume_data.get("experience", ""),
            "projects": resume_data.get("projects", []),
            "education": resume_data.get("education", "")
        }
        
        print("Starting interview with filtered resume data:", json.dumps(interview_context, indent=2))
        response = interviewer.get_first_question(interview_context)
        
        # Return response with both text and audio
        headers = {
            "Access-Control-Expose-Headers": "question-text",
            "question-text": base64.b64encode(response["question"].encode()).decode(),
            "Content-Type": "audio/mp3",
            "Content-Disposition": "inline"
        }
        
        return StreamingResponse(
            io.BytesIO(response["audio"]),
            media_type="audio/mp3",
            headers=headers
        )
    except Exception as e:
        print(f"Error in start_interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/next-question")
async def next_question(
    resume_data: str = Form(...),
    history: str = Form(...),
    answer_audio: Optional[UploadFile] = File(None)
):
    """Generate the next interview question based on previous Q&A"""
    if not interviewer:
        raise HTTPException(status_code=500, detail="Interviewer not initialized")
    
    try:
        # Parse JSON strings from FormData
        resume_data_dict = json.loads(resume_data)
        history_list = json.loads(history)
        
        # Handle the answer audio if provided
        if answer_audio:
            audio_data = await answer_audio.read()
            try:
                answer_text = interviewer.speech_to_text(audio_data)
                history_list[-1]["answer"] = answer_text
            except Exception as e:
                print(f"Error processing speech: {str(e)}")
                # If speech-to-text fails, use the last text answer from history
                pass
        
        # If 5 or more QAs (1 initial + 4 follow-ups), return summary
        if len(history_list) >= 5:
            summary = interviewer.get_summary(resume_data_dict, history_list)
            headers = {
                "Access-Control-Expose-Headers": "question-text",
                "question-text": base64.b64encode(summary["summary"].encode()).decode(),
                "Content-Type": "audio/mp3",
                "Content-Disposition": "inline"
            }
            return StreamingResponse(
                io.BytesIO(summary["audio"]),
                media_type="audio/mp3",
                headers=headers
            )
        
        # Otherwise, continue with next question
        response = interviewer.get_next_question(resume_data_dict, history_list)
        
        # Return response with both text and audio
        headers = {
            "Access-Control-Expose-Headers": "question-text",
            "question-text": base64.b64encode(response["question"].encode()).decode(),
            "Content-Type": "audio/mp3",
            "Content-Disposition": "inline"
        }
        
        return StreamingResponse(
            io.BytesIO(response["audio"]),
            media_type="audio/mp3",
            headers=headers
        )
    except Exception as e:
        print(f"Error in next_question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def read_root():
    return {"message": "Talent Track Interview API is running"}
