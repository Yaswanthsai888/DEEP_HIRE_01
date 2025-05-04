import os
import tempfile
import uuid
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from Resume_parser import parse_resume  # Ensure this module exists and works

app = FastAPI(title="Resume Parser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pac-talent-track.web.app", 
        "https://deep-hire-app.web.app",
        "https://resume-parser-service-g9u8.onrender.com"  # Add the render.com domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.head("/")
async def head_root():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Resume Parser is live",
        "parse_endpoint": "/parse-resume"
    }

@app.post("/parse-resume")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")

    try:
        # Write uploaded file to temporary file
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Process the file
        result = parse_resume(temp_path)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    
    finally:
        # Ensure temporary file is always cleaned up
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Error cleaning up temporary file {temp_path}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
