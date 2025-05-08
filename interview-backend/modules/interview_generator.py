from typing import List, Dict, Any
import json
import os
from .ollama_interviewer import OllamaInterviewer

class InterviewGenerator:
    def __init__(self):
        """Initialize the interview generator with required models"""
        # Initialize Ollama-based interviewer for RAG-driven interview
        self.interviewer = OllamaInterviewer()
        
    def conduct_interview(self, resume_data: Dict[str, Any], duration_minutes: int = 10) -> str:
        """Conduct a RAG-driven interview using Ollama model for specified duration"""
        return self.interviewer.conduct_interview(resume_data.get('full_text', ''), duration_minutes)