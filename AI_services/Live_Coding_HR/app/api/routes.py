from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import time
import requests
from app.model_handler import generate_hint, generate_follow_up  # Use HuggingFace model only
from app.core.session_manager import get_context, add_to_context

# In-memory session store
sessions = {}

# Define backend API URL (adjust if your backend runs elsewhere)
BACKEND_API_URL = "http://localhost:5000/api"

MODEL_NAME = "codellama:latest"

class StartSessionRequest(BaseModel):
    user_id: str

class StartSessionResponse(BaseModel):
    session_id: str
    question: dict
    start_time: float

class SubmitCodeRequest(BaseModel):
    session_id: str
    code: str
    language: str

class SubmitCodeResponse(BaseModel):
    result: str
    feedback: str
    score: int

class SessionStatusRequest(BaseModel):
    session_id: str

class SessionStatusResponse(BaseModel):
    session_id: str
    question_id: str
    start_time: float
    hints_used: int
    completed: bool
    result: str | None = None
    feedback: str | None = None
    score: int | None = None

class RequestHintRequest(BaseModel):
    session_id: str
    code_so_far: str

class RequestHintResponse(BaseModel):
    hint: str
    hints_used: int

class LiveFeedbackRequest(BaseModel):
    code_so_far: str

class LiveFeedbackResponse(BaseModel):
    feedback: str

class GetFollowupRequest(BaseModel):
    session_id: str

class GetFollowupResponse(BaseModel):
    followup_question: dict

router = APIRouter()

@router.post("/start-session", response_model=StartSessionResponse)
def start_session(req: StartSessionRequest):
    try:
        # Fetch questions from the main backend
        response = requests.get(f"{BACKEND_API_URL}/questions")
        response.raise_for_status()
        available_questions = response.json()
        if not available_questions:
            raise HTTPException(status_code=503, detail="No questions available from backend.")
        # Select a question (e.g., the first one for now)
        question = available_questions[0]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching questions from backend: {e}")
        raise HTTPException(status_code=503, detail=f"Could not connect to backend to fetch questions: {e}")
    except Exception as e:
        print(f"Error processing questions from backend: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing questions: {e}")

    session_id = str(uuid.uuid4())
    start_time = time.time()
    sessions[session_id] = {
        "user_id": req.user_id,
        "question_id": question["_id"],
        "start_time": start_time,
        "hints_used": 0,
        "completed": False,
        "final_code": None
    }
    return StartSessionResponse(
        session_id=session_id,
        question=question,
        start_time=start_time
    )

@router.post("/submit-code", response_model=SubmitCodeResponse)
def submit_code(req: SubmitCodeRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["completed"]:
        raise HTTPException(status_code=400, detail="Session already completed")

    # Mock code evaluation
    passed_all_tests = True
    result = "passed" if passed_all_tests else "failed"
    feedback = "Good job! (mock feedback)"
    score = 100 if passed_all_tests else 0

    session["completed"] = True
    session["result"] = result
    session["feedback"] = feedback
    session["score"] = score
    session["final_code"] = req.code

    return SubmitCodeResponse(result=result, feedback=feedback, score=score)

@router.get("/session-status", response_model=SessionStatusResponse)
def session_status(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionStatusResponse(
        session_id=session_id,
        question_id=session["question_id"],
        start_time=session["start_time"],
        hints_used=session["hints_used"],
        completed=session["completed"],
        result=session.get("result"),
        feedback=session.get("feedback"),
        score=session.get("score")
    )

@router.post("/request-hint", response_model=RequestHintResponse)
def request_hint(req: RequestHintRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["completed"]:
        raise HTTPException(status_code=400, detail="Session already completed")

    try:
        q_id = session["question_id"]
        response = requests.get(f"{BACKEND_API_URL}/questions/{q_id}")
        response.raise_for_status()
        question = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching question {q_id} from backend: {e}")
        raise HTTPException(status_code=503, detail=f"Could not connect to backend to fetch question details: {e}")
    except Exception as e:
        print(f"Error processing question {q_id} from backend: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing question details: {e}")

    if not question:
        raise HTTPException(status_code=404, detail="Question details not found in backend")

    context = get_context(req.session_id)
    # Use HuggingFace model for hint
    hint = generate_hint(req.code_so_far, question.get("description", ""))
    add_to_context(req.session_id, f"Hint request with code:\n{req.code_so_far}", hint)
    session["hints_used"] += 1
    return RequestHintResponse(hint=hint, hints_used=session["hints_used"])

@router.post("/live-feedback", response_model=LiveFeedbackResponse)
def live_feedback(req: LiveFeedbackRequest):
    # Use HuggingFace model for feedback (same as hint, or customize as needed)
    feedback = generate_hint(req.code_so_far, "Live feedback for code")
    return LiveFeedbackResponse(feedback=feedback)

@router.get("/get-followup", response_model=GetFollowupResponse)
def get_followup(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.get("completed") or not session.get("final_code"):
        raise HTTPException(status_code=400, detail="Follow-up requires a completed session with submitted code.")

    try:
        q_id = session["question_id"]
        response = requests.get(f"{BACKEND_API_URL}/questions/{q_id}")
        response.raise_for_status()
        question = response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to backend to fetch question details: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question details: {e}")

    if not question:
        raise HTTPException(status_code=404, detail="Question details not found in backend for follow-up")

    # Use HuggingFace model for follow-up
    suggestion_text = generate_follow_up(question.get("description", ""))

    if suggestion_text is None:
        raise HTTPException(status_code=404, detail="No suitable follow-up suggestion available for this solution.")

    add_to_context(session_id, "Request for follow-up suggestion", suggestion_text)

    followup_data = {"title": "Follow-up Suggestion", "description": suggestion_text, "id": "followup-" + q_id}
    return GetFollowupResponse(followup_question=followup_data)
