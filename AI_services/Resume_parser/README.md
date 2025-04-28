# Resume Parser Microservice

## Overview
This microservice extracts skills from PDF resumes using spaCy and custom skill matching.

## Setup

### Prerequisites
- Python 3.8+
- pip
- Virtual Environment (recommended)

### Installation
1. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Running the Service
```bash
uvicorn resume_parser_service:app --host 0.0.0.0 --port 8000
```

## Endpoints
- `/parse-resume/`: POST endpoint for uploading and parsing resumes
  - Accepts PDF files
  - Returns extracted skills

## Features
- PDF text extraction
- Skill matching using spaCy
- Temporary file handling
- CORS support

## Error Handling
- Validates file type (PDF only)
- Handles PDF parsing errors
- Cleans up temporary files

## Security
- Temporary file storage
- No persistent resume storage
- CORS configuration
