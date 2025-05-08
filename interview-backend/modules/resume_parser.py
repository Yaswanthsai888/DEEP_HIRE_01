import PyPDF2
import spacy
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import Dict, List, Any
import re
from datetime import datetime
from .tinyllama import TinyLLaMA  # Local implementation of LLM-based extractor
import json
from io import BytesIO

class ResumeParser:
    def __init__(self):
        """Initialize the resume parser with required models and patterns"""
        self.nlp = spacy.load("en_core_web_lg")
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device='cpu')
        # Initialize TinyLLaMA for structured profile extraction
        self.llm = TinyLLaMA()
        
        # Email and phone patterns for basic contact info
        self.email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        self.phone_pattern = r'[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}'

    def preprocess_text(self, text: str) -> str:
        """Clean and preprocess the text"""
        # Remove multiple newlines and spaces
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep essential punctuation
        text = re.sub(r'[^\w\s\.\,\-\(\)\/@]', '', text)
        return text.strip()

    def extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract contact information from text"""
        email = re.findall(self.email_pattern, text)
        phone = re.findall(self.phone_pattern, text)
        
        return {
            'email': email[0] if email else None,
            'phone': phone[0] if phone else None
        }

    def extract_structured_profile(self, text: str) -> Dict[str, Any]:
        """Use LLM to extract structured candidate profile for AI interview rounds"""
        prompt = (
            "Extract the candidate's profile from the resume text in JSON format with the following keys:\n" +
            "- 'summary': A concise professional summary of the candidate\n" +
            "- 'core_skills': List of key technical and soft skills\n" +
            "- 'key_achievements': List of major professional accomplishments\n" +
            "- 'experience_overview': Summary of work experience\n" +
            "- 'education_overview': Summary of education background\n" +
            "- 'projects': List of significant projects\n" +
            "- 'technical_skills': List of technical skills only\n" +
            "- 'soft_skills': List of soft skills only\n\n" +
            "Resume text:\n" + text
        )
        # Generate JSON response from LLM
        response = self.llm.complete(prompt)
        try:
            profile = json.loads(response)
        except json.JSONDecodeError:
            profile = {'error': 'Failed to parse LLM output', 'raw_output': response}
        return profile

    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embeddings for the text"""
        return self.embedding_model.encode(text)

    def parse_resume(self, file_content) -> Dict[str, Any]:
        """Parse the resume file and extract relevant information"""
        # Convert bytes to BytesIO if needed
        if isinstance(file_content, bytes):
            file_content = BytesIO(file_content)
            
        # Read PDF content
        reader = PyPDF2.PdfReader(file_content)
        text = ""
        for page in reader.pages:
            text += page.extract_text()

        # Preprocess text
        text = self.preprocess_text(text)
        
        # Get contact info (for immediate display)
        contact_info = self.extract_contact_info(text)
        
        # LLM-based structured profile extraction
        structured_profile = self.extract_structured_profile(text)
        
        # Generate embedding for similarity search and convert to list
        embedding = self.generate_embedding(text).tolist()  # Convert numpy array to list

        # Construct response using mainly the LLM-extracted data
        return {
            'full_text': text,
            'contact_info': contact_info,
            'skills': {
                'technical_skills': structured_profile.get('technical_skills', []),
                'soft_skills': structured_profile.get('soft_skills', []),
                'other_skills': []
            },
            'education': [{'degree': structured_profile.get('education_overview', ''), 'entities': []}],
            'experience': [{'text': structured_profile.get('experience_overview', ''), 'dates': [], 'organizations': []}],
            'sections': {'profile': structured_profile.get('summary', '')},
            'embedding': embedding,  # Now contains a list instead of numpy array
            'structured_profile': structured_profile
        }

# Create a global instance
_parser = ResumeParser()

def parse_resume(file) -> Dict[str, Any]:
    """Wrapper function to parse resume using global ResumeParser instance"""
    return _parser.parse_resume(file)