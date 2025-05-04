import os
import tempfile
import uuid
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from Resume_parser import parse_resume

app = FastAPI(title="Resume Parser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pac-talent-track.web.app", 
        "https://deep-hire-app.web.app",
        "https://resume-parser-service-g9u8.onrender.com",
        "http://localhost:5000"  # Add backend server for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.head("/")
async def head_root():
    return JSONResponse({"status": "ok"})

@app.get("/")
async def root():
    return JSONResponse({
        "status": "ok",
        "message": "Resume Parser is live",
        "parse_endpoint": "/parse-resume"
    })

@app.post("/parse-resume")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "detail": "Only PDF files are supported"}
        )

    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")

    try:
        # Write uploaded file to temporary file
        contents = await file.read()
        with open(temp_path, "wb") as buffer:
            buffer.write(contents)
        
        # Process the file
        result = parse_resume(temp_path)
        
        return JSONResponse(
            content=result,
            headers={"Content-Type": "application/json"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": f"Error processing file: {str(e)}"}
        )
    
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
