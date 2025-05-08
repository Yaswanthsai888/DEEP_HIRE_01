import json
import re
from transformers import pipeline
from typing import Dict, Any, List, Optional

class TinyLLaMA:
    """
    A lightweight mock implementation of an LLM for resume parsing and structured data extraction.
    Uses available transformers models to simulate LLM capabilities for extraction tasks.
    """
    
    def __init__(self):
        """Initialize the TinyLLaMA with a text generation pipeline"""
        # Use a smaller T5 model for text generation tasks
        try:
            self.generator = pipeline('text2text-generation', model='google/flan-t5-small')
        except Exception as e:
            print(f"Failed to load flan-t5-small model: {e}")
            # Fallback to rule-based extraction if model fails to load
            self.generator = None
    
    def complete(self, prompt: str) -> str:
        """Complete a prompt using the text generation model or rules-based approach"""
        # Extract key information from the prompt
        resume_text = self._extract_resume_text(prompt)
        
        if self.generator is not None:
            # Generate a shorter summary for faster processing
            try:
                # Use the model to generate a brief summary
                summary_prompt = f"Summarize this resume: {resume_text[:1000]}"
                summary = self.generator(summary_prompt, max_length=200, num_return_sequences=1)[0]['generated_text']
                
                # Extract core skills
                skills_prompt = f"List the technical skills from this resume: {resume_text[:1000]}"
                skills_text = self.generator(skills_prompt, max_length=100, num_return_sequences=1)[0]['generated_text']
                
                # Extract key achievements
                achieve_prompt = f"List 3 key achievements from this resume: {resume_text[:1000]}"
                achievements_text = self.generator(achieve_prompt, max_length=150, num_return_sequences=1)[0]['generated_text']
                
                # Format as structured JSON
                return self._build_json_profile(summary, skills_text, achievements_text, resume_text)
            except Exception as e:
                print(f"Error in model generation: {e}")
                # Fall back to rule-based approach
                return self._rule_based_extraction(resume_text)
        else:
            # Use rule-based approach if model wasn't loaded
            return self._rule_based_extraction(resume_text)
    
    def _extract_resume_text(self, prompt: str) -> str:
        """Extract the resume text portion from the prompt"""
        if "Resume text:" in prompt:
            return prompt.split("Resume text:", 1)[1].strip()
        return prompt
    
    def _build_json_profile(self, summary: str, skills_text: str, achievements_text: str, resume_text: str) -> str:
        """Build a JSON-formatted profile from extracted information"""
        # Extract skills as lists
        tech_skills = self._extract_technical_skills(resume_text)
        soft_skills = self._extract_soft_skills(resume_text)
        
        # Extract achievements as a list
        achievements = [ach.strip() for ach in achievements_text.split('\n') if ach.strip()]
        if not achievements or all(len(a) > 100 for a in achievements):
            # If achievements are missing or too long (likely not real achievements)
            achievements = self._extract_achievements(resume_text)
        
        # Clean the summary - remove contact info if it got included
        summary = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', summary)
        summary = re.sub(r'[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}', '', summary)
        
        # Extract projects
        projects = self._extract_projects(resume_text)
        
        # Build structured profile
        profile = {
            "summary": summary.strip(),
            "core_skills": tech_skills + soft_skills,
            "technical_skills": tech_skills,
            "soft_skills": soft_skills,
            "key_achievements": achievements,
            "experience_overview": self._extract_experience(resume_text),
            "education_overview": self._extract_education(resume_text),
            "projects": projects
        }
        
        return json.dumps(profile, indent=2)
    
    def _rule_based_extraction(self, text: str) -> str:
        """Rule-based extraction of profile information"""
        # Extract key sections
        experience = self._extract_experience(text)
        education = self._extract_education(text)
        tech_skills = self._extract_technical_skills(text)
        soft_skills = self._extract_soft_skills(text)
        projects = self._extract_projects(text)
        achievements = self._extract_achievements(text)
        
        # Create a default summary
        summary = "Professional with experience in " + ", ".join(tech_skills[:3]) if tech_skills else "technology"
        
        profile = {
            "summary": summary,
            "core_skills": tech_skills + soft_skills,
            "technical_skills": tech_skills,
            "soft_skills": soft_skills,
            "key_achievements": achievements,
            "experience_overview": experience,
            "education_overview": education,
            "projects": projects
        }
        
        return json.dumps(profile, indent=2)
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from text using regex patterns"""
        skill_patterns = [
            r'\b(?:Python|Java|JavaScript|TypeScript|React|Angular|Vue\.js|Node\.js)\b',
            r'\b(?:SQL|MySQL|PostgreSQL|MongoDB|Redis|DynamoDB)\b',
            r'\b(?:AWS|Azure|GCP|Docker|Kubernetes|Terraform)\b',
            r'\b(?:Git|CI/CD|Jenkins|GitHub Actions|Agile|Scrum)\b',
            r'\b(?:Machine Learning|AI|Deep Learning|NLP|Computer Vision)\b'
        ]
        
        skills = []
        for pattern in skill_patterns:
            matches = re.findall(pattern, text)
            skills.extend(matches)
        
        return list(set(skills))
    
    def _extract_technical_skills(self, text: str) -> List[str]:
        """Extract technical skills from text using regex patterns"""
        tech_skill_patterns = [
            # Programming Languages
            r'\b(?:Python|Java|JavaScript|TypeScript|C\+\+|C#|Ruby|Go|PHP|Swift|Kotlin|Scala|R|Rust)\b',
            # Web technologies
            r'\b(?:HTML|CSS|React|Angular|Vue\.js|Node\.js|Express|Next\.js|Redux|jQuery|Bootstrap|Tailwind|SASS|LESS)\b',
            # Data technologies
            r'\b(?:SQL|MySQL|PostgreSQL|MongoDB|Redis|DynamoDB|Cassandra|Oracle|SQLite|MariaDB|Neo4j)\b',
            # Cloud & DevOps
            r'\b(?:AWS|Azure|GCP|Docker|Kubernetes|Terraform|Jenkins|CircleCI|TravisCI|GitLab CI|Ansible|Puppet|Chef)\b',
            # AI & ML
            r'\b(?:Machine Learning|Deep Learning|NLP|Computer Vision|TensorFlow|PyTorch|Keras|Scikit-learn|OpenCV|NLTK|spaCy|huggingface)\b',
            # Data science
            r'\b(?:Pandas|NumPy|SciPy|Matplotlib|Seaborn|Tableau|Power BI|Jupyter|Data Mining|Data Analysis|Statistics)\b',
            # Mobile
            r'\b(?:Android|iOS|React Native|Flutter|Xamarin|Ionic|Swift|Objective-C)\b',
            # Tools & Others
            r'\b(?:Git|GitHub|GitLab|Bitbucket|JIRA|Confluence|Trello|Agile|Scrum|Kanban|REST API|GraphQL|gRPC)\b',
            # AI-specific
            r'\b(?:LLM|Large Language Model|RAG|Retrieval Augmented Generation|GenAI|Generative AI|Embeddings|Fine-tuning|Prompt Engineering)\b',
            # Fast API and other frameworks
            r'\b(?:FastAPI|Django|Flask|Spring Boot|ASP\.NET|Laravel|Ruby on Rails|Symfony)\b'
        ]
        
        tech_skills = []
        for pattern in tech_skill_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)  # Use case-insensitive matching
            tech_skills.extend([match.strip() for match in matches])
        
        # Remove duplicates while preserving case
        seen = set()
        unique_skills = []
        for skill in tech_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)
        
        return unique_skills

    def _extract_soft_skills(self, text: str) -> List[str]:
        """Extract soft skills from text using regex patterns"""
        soft_skill_patterns = [
            r'\b(?:Communication|Teamwork|Leadership|Problem[- ]solving|Adaptability|Creativity|Work ethic|Time management)\b',
            r'\b(?:Critical thinking|Emotional intelligence|Conflict resolution|Negotiation|Presentation|Public speaking|Decision making)\b',
            r'\b(?:Collaboration|Interpersonal|Customer service|Mentoring|Coaching|Project management|Organization|Detail[- ]oriented)\b',
            r'\b(?:Self[- ]motivated|Independent|Multitasking|Prioritization|Flexibility|Patience|Persistence|Resilience)\b',
            r'\b(?:Analytical thinking|Strategic planning|Innovation|Cultural awareness|Empathy|Active listening|Networking)\b'
        ]
        
        soft_skills = []
        for pattern in soft_skill_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)  # Use case-insensitive matching
            soft_skills.extend([match.strip() for match in matches])
        
        # Remove duplicates while preserving case
        seen = set()
        unique_skills = []
        for skill in soft_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)
        
        return unique_skills

    def _extract_experience(self, text: str) -> str:
        """Extract experience overview from text"""
        experience_patterns = [
            r'(?:Experience|Work History|Employment).*?(?=Education|Skills|Projects|$)',
            r'(?:Professional Experience|Work Experience).*?(?=Education|Skills|Projects|$)'
        ]
        
        for pattern in experience_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(0).strip()
        
        return "Professional experience in relevant industry roles"
    
    def _extract_education(self, text: str) -> str:
        """Extract education overview from text"""
        education_patterns = [
            r'(?:Education|Academic|Qualification).*?(?=Experience|Skills|Projects|$)',
            r'(?:Educational Background|Academic History).*?(?=Experience|Skills|Projects|$)'
        ]
        
        for pattern in education_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(0).strip()
        
        return "Formal education in relevant field"
    
    def _extract_projects(self, text: str) -> List[str]:
        """Extract projects from text"""
        projects_section = ""
        projects_patterns = [
            r'(?:Projects|Personal Projects|Professional Projects|Key Projects).*?(?=Experience|Education|Skills|Technical|$)',
            r'PROJECT[S]?.*?(?=EXPERIENCE|EDUCATION|SKILLS|TECHNICAL|$)'
        ]
        
        for pattern in projects_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                projects_section = match.group(0).strip()
                break
        
        if not projects_section:
            # If no dedicated projects section is found, try to extract from the resume text
            project_indicators = ['project:', 'developed', 'implemented', 'created', 'built']
            
            # Extract sentences that might contain project descriptions
            sentences = re.split(r'(?<=[.!?])\s+', text)
            potential_projects = []
            
            for sentence in sentences:
                if any(indicator in sentence.lower() for indicator in project_indicators):
                    if len(sentence) > 20 and len(sentence) < 300:  # Reasonable project description length
                        potential_projects.append(sentence.strip())
            
            if potential_projects:
                return potential_projects[:5]  # Return top 5 potential projects
            
            # Default projects if nothing found
            return [
                "Developed web applications using modern frameworks",
                "Implemented machine learning models for data analysis",
                "Created data visualization dashboards for business insights"
            ]
        
        # Split into individual projects - look for bullets, numbers, or distinct paragraphs
        project_markers = re.split(r'(?:\r?\n\s*[\•\-\*\d\.\➢▪]\s*|\r?\n\s*\r?\n)', projects_section)
        
        # Clean up the projects
        cleaned_projects = []
        for project in project_markers:
            # Skip the section header
            if re.match(r'^\s*(?:Projects?|Personal Projects?|Professional Projects?|Key Projects?)\s*$', project, re.IGNORECASE):
                continue
                
            # Clean up the project text
            project = project.strip()
            if project and len(project) > 15:  # Minimum reasonable length for a project description
                # Remove bullets at the beginning
                project = re.sub(r'^[\•\-\*\d\.\➢▪]\s*', '', project)
                cleaned_projects.append(project)
        
        if cleaned_projects:
            return cleaned_projects
        
        # Fall back to simple split by newlines if other parsing failed
        simple_projects = [p.strip() for p in re.split(r'\n+', projects_section) if p.strip()]
        # Filter out the header
        simple_projects = [p for p in simple_projects if not re.match(r'^\s*(?:Projects?|Personal Projects?|Professional Projects?|Key Projects?)\s*$', p, re.IGNORECASE)]
        
        return simple_projects if simple_projects else [
            "Developed web applications using modern frameworks",
            "Implemented machine learning models for data analysis",
            "Created data visualization dashboards for business insights"
        ]
    
    def _extract_achievements(self, text: str) -> List[str]:
        """Extract achievements from text"""
        achievement_patterns = [
            r'(?:Achievements|Key Achievements|Accomplishments).*?(?=Experience|Education|Skills|Projects|$)'
        ]
        
        achievements_section = ""
        for pattern in achievement_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                achievements_section = match.group(0).strip()
                break
        
        if not achievements_section:
            return [
                "Successfully completed projects on time and within budget",
                "Improved system efficiency by optimizing code",
                "Collaborated effectively with cross-functional teams"
            ]
        
        achievements = [ach.strip() for ach in re.split(r'\n+', achievements_section) if ach.strip()]
        return achievements if achievements else [
            "Successfully completed projects on time and within budget",
            "Improved system efficiency by optimizing code",
            "Collaborated effectively with cross-functional teams"
        ]