import psycopg2
from psycopg2.extras import execute_values, Json
from pgvector.psycopg2 import register_vector
import numpy as np
import json
from typing import List, Dict, Any, Optional

class Database:
    def __init__(self, dbname="talenttrack", user="postgres", password="your_password", host="localhost"):
        self.conn_params = {
            "dbname": dbname,
            "user": user,
            "password": password,
            "host": host
        }
        
    def get_connection(self):
        """Create a new database connection"""
        conn = psycopg2.connect(**self.conn_params)
        register_vector(conn)
        return conn

    def insert_resume(self, full_text: str, skills: List[str], embedding: np.ndarray, 
                     email: Optional[str] = None, phone: Optional[str] = None,
                     technical_skills: Optional[List[str]] = None, 
                     projects: Optional[List[Dict]] = None,
                     education: Optional[str] = None) -> int:
        """Insert a resume into the database with all structured data"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO resumes (
                        full_text, skills, embedding, 
                        email, phone, technical_skills, 
                        projects, education
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        full_text, skills, embedding.tolist(),
                        email, phone, technical_skills or [],
                        Json(projects) if projects else None, education
                    )
                )
                resume_id = cur.fetchone()[0]
                conn.commit()
                return resume_id

    def find_similar_resumes(self, query_embedding: np.ndarray, limit: int = 5) -> List[Dict[str, Any]]:
        """Find similar resumes based on embedding similarity"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, full_text, skills, embedding <-> %s as distance,
                           email, phone, technical_skills, projects, education
                    FROM resumes
                    ORDER BY distance
                    LIMIT %s
                    """,
                    (query_embedding.tolist(), limit)
                )
                results = cur.fetchall()
                return [
                    {
                        "id": row[0],
                        "full_text": row[1],
                        "skills": row[2],
                        "distance": row[3],
                        "email": row[4],
                        "phone": row[5],
                        "technical_skills": row[6],
                        "projects": row[7],
                        "education": row[8]
                    }
                    for row in results
                ]

    def get_resume_by_id(self, resume_id: int) -> Dict[str, Any]:
        """Retrieve a resume by its ID with all structured data"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, full_text, skills, embedding, 
                           email, phone, technical_skills, 
                           projects, education
                    FROM resumes
                    WHERE id = %s
                    """,
                    (resume_id,)
                )
                row = cur.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "full_text": row[1],
                        "skills": row[2],
                        "embedding": row[3],
                        "email": row[4],
                        "phone": row[5],
                        "technical_skills": row[6],
                        "projects": row[7],
                        "education": row[8]
                    }
                return None
                
    def search_technical_skills(self, skills: List[str], limit: int = 10) -> List[Dict[str, Any]]:
        """Find resumes that match specific technical skills"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, email, phone, technical_skills, projects, education
                    FROM resumes
                    WHERE technical_skills && %s
                    LIMIT %s
                    """,
                    (skills, limit)
                )
                results = cur.fetchall()
                return [
                    {
                        "id": row[0],
                        "email": row[1],
                        "phone": row[2],
                        "technical_skills": row[3],
                        "projects": row[4],
                        "education": row[5]
                    }
                    for row in results
                ]
                
    def get_candidates_for_rag(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get structured candidate data for use in a RAG system"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, email, phone, technical_skills, projects, education
                    FROM resumes
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,)
                )
                results = cur.fetchall()
                return [
                    {
                        "id": row[0],
                        "email": row[1],
                        "phone": row[2],
                        "technical_skills": row[3],
                        "projects": row[4],
                        "education": row[5]
                    }
                    for row in results
                ]