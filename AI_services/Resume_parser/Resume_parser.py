import spacy
from spacy.matcher import PhraseMatcher
import json
import os
import pdfplumber
from typing import List, Optional

# Load spaCy model globally to avoid reloading for each request
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy English model...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_skills(text: str) -> List[str]:
    """
    Extracts and returns a list of unique skills from the provided resume text,
    covering a broad range from beginner to advanced SWE, ECE, EEE, and related tech fields,
    using synonyms for better matching.

    Args:
        text (str): Raw text extracted from a resume

    Returns:
        List[str]: A list of unique skills found in the text
    """
    skills_list = {
        # General Programming & Software Engineering
        "Python": ["python scripting", "python programming"],
        "Java": ["java development", "java programming"],
        "C++": ["c plus plus", "cpp"],
        "C": ["c programming"],
        "JavaScript": ["js", "javascript development"],
        "TypeScript": ["ts", "typescript development"],
        "Go": ["golang"],
        "Rust": [],
        "Swift": ["ios development"],
        "Kotlin": ["android development"],
        "HTML": ["hypertext markup language"],
        "CSS": ["cascading style sheets"],
        "SQL": ["structured query language"],
        "NoSQL": ["non-relational databases"],
        "Git": ["version control system", "vcs"],
        "Version Control": [],
        "Agile": ["agile methodologies"],
        "Scrum": ["scrum framework"],
        "Software Development": ["software development life cycle", "sdlc"],
        "Software Engineering": [],
        "Object-Oriented Programming": ["oop"],
        "Data Structures": [],
        "Algorithms": [],
        "Software Testing": ["qa testing", "quality assurance"],
        "Debugging": ["code debugging"],
        "Software Architecture": ["system architecture"],
        "API Development": ["application programming interface development"],
        "Microservices": [],
        "Full-Stack Development": [],
        "Front-End Development": ["client-side development"],
        "Back-End Development": ["server-side development"],
        "Mobile App Development": ["mobile development"],
        "Web Development": [],
        "Database Management": ["db management"],
        "Database Systems": [],
        "Operating Systems": ["os"],
        "Software Design": [],
        "Software Maintenance": [],
        "Code Review": [],
        "Scripting": [],
        "Linux": ["unix-like operating systems"],
        "Unix": [],
        "Bash": ["shell scripting"],
        "Continuous Integration": ["ci"],
        "Continuous Deployment": ["cd"],
        "CI/CD": ["continuous integration/continuous deployment"],
        "DevOps": ["development operations"],
        "Containerization": [],
        "Docker": [],
        "Kubernetes": ["k8s"],
        "Cloud Computing": [],
        "Cloud Infrastructure": [],
        "Cloud Services": [],
        "Cloud Architecture": [],
        "Cloud Migration": [],
        "Cloud Security": [],
        "Cloud Cost Optimization": [],
        "Cloud Native Computing": [],
        "Cloud Data Engineering": [],
        "Cloud Data Analytics": [],
        "Cloud Data Science": [],
        "Cloud Data Integration": [],
        "Cloud Data Management": [],
        "Cloud Data Security": [],
        "Cloud Data Governance": [],
        "Cloud Data Quality": [],
        "Cloud Data Visualization": [],
        "Database Administration": ["dba"],
        "Game Development": [],

        # Data Science, AI, and Machine Learning
        "Data Science": [],
        "Machine Learning": ["ml"],
        "Deep Learning": ["dl"],
        "Artificial Intelligence": ["ai"],
        "Natural Language Processing": ["nlp"],
        "Computer Vision": ["cv"],
        "Data Analysis": [],
        "Data Mining": [],
        "Data Visualization": [],
        "Statistics": [],
        "Mathematics": ["math"],
        "Big Data": [],
        "Data Wrangling": [],
        "Feature Engineering": [],
        "Model Evaluation": [],
        "Predictive Modeling": [],
        "Neural Networks": [],
        "Reinforcement Learning": [],
        "Time Series Analysis": [],
        "Data Modeling": [],

        # Electrical and Computer Engineering (ECE) & Electrical and Electronics Engineering (EEE)
        "Circuit Design": [],
        "Embedded Systems": [],
        "Digital Signal Processing": ["dsp"],
        "Analog Circuit Design": [],
        "Power Electronics": [],
        "Control Systems": [],
        "VLSI Design": ["very large scale integration"],
        "Microcontrollers": ["mcu"],
        "Microprocessors": ["cpu"],
        "FPGA": ["field-programmable gate array"],
        "PCB Design": ["printed circuit board design"],
        "Signal Processing": [],
        "Robotics": [],
        "Internet of Things": ["iot"],
        "IoT": [],
        "Communication Systems": [],
        "Telecommunications": [],
        "Wireless Communication": [],
        "Networking": [],
        "Computer Architecture": [],
        "Digital Logic": [],
        "Analog Electronics": [],
        "Instrumentation": [],
        "Power Systems": [],
        "Renewable Energy": [],
        "Electrical Machines": [],
        "Electromagnetics": [],
        "Semiconductor Devices": [],
        "Embedded Software": [],
        "Real-Time Systems": [],

        # Cybersecurity and Networking
        "Cybersecurity": ["information security"],
        "Networking": ["network administration"],
        "Cryptography": [],
        "Information Security": [],
        "Network Security": [],
        "Penetration Testing": ["pentesting"],
        "Vulnerability Assessment": [],
        "Security Auditing": [],
        "Firewalls": [],
        "Intrusion Detection": [],
        "Network Protocols": [],
        "TCP/IP": [],
        "DNS": ["domain name system"],
        "Routing": [],
        "Switching": [],
        "Network Administration": [],
        "Information Systems": ["is"],

        # Emerging Technologies
        "Blockchain": [],
        "Virtual Reality": ["vr"],
        "Augmented Reality": ["ar"],
        "Mixed Reality": ["mr"],
        "Quantum Computing": [],
        "Edge Computing": [],
        "Distributed Systems": [],
        "Human-Computer Interaction": ["hci"],
        "Computer Graphics": [],
        "Computational Complexity": [],
        "Computational Biology": [],

        # Specific Tools and Frameworks
        "TensorFlow": ["tf"],
        "PyTorch": [],
        "Scikit-learn": ["sklearn"],
        "Pandas": [],
        "NumPy": [],
        "Spark": ["apache spark"],
        "Hadoop": ["apache hadoop"],
        "AWS": ["amazon web services"],
        "Azure": ["microsoft azure"],
        "GCP": ["google cloud platform"],
        "React": ["reactjs"],
        "Angular": ["angularjs"],
        "Vue.js": ["vue"],
        "Node.js": ["nodejs"],
        "Django": [],
        "Flask": [],
        "Spring Boot": [],
        ".NET": [],
        "MATLAB": [],
        "Simulink": [],
        "LabVIEW": [],
        "Cadence": [],
        "Altium": [],
        "Proteus": [],
        "PSpice": [],
        "Arduino": [],
        "Raspberry Pi": [],

        # Soft Skills
        "Problem Solving": [],
        "Communication": [],
        "Teamwork": [],
        "Collaboration": [],
        "Project Management": [],
        "Critical Thinking": [],
        "Analytical Skills": [],
        "Leadership": [],
        "Time Management": [],
        "Presentation Skills": [],
        "Documentation": [],
        "Adaptability": [],
        "Learning Agility": [],
    }

    # Normalize input text
    text = text.lower()

    # Initialize matcher
    matcher = PhraseMatcher(nlp.vocab, attr='LOWER')

    # Prepare patterns
    skill_patterns = []
    for skill, synonyms in skills_list.items():
        # Add the main skill and its synonyms as patterns
        patterns = [nlp.make_doc(skill.lower())] + [nlp.make_doc(syn.lower()) for syn in synonyms]
        skill_patterns.extend(patterns)

    matcher.add("SKILLS", skill_patterns)

    # Process the text with spaCy
    doc = nlp(text)

    # Find matches
    found_skills = []
    matches = matcher(doc)
    for match_id, start, end in matches:
        span = doc[start:end]
        skill = span.text.title()  # Convert to title case
        found_skills.append(skill)

    return list(set(found_skills))  # Return unique skills

def parse_pdf(file_path: str) -> Optional[str]:

    try:
        with pdfplumber.open(file_path) as pdf:
            text = ' '.join([page.extract_text() or '' for page in pdf.pages])
        return text
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return None

def parse_resume(file_path: str) -> dict:

    # Extract text from PDF
    resume_text = parse_pdf(file_path)
    
    if not resume_text:
        return {
            "success": False,
            "message": "Failed to extract text from resume",
            "skills": []
        }

    # Extract skills
    skills = extract_skills(resume_text)

    return {
        "success": True,
        "skills": skills
    }

if __name__ == "__main__":
    default_resume_path = os.path.join(os.path.expanduser("~"), "Downloads", "Yaswanth_Sai_Podapati.pdf")
    
    # Use the new parse_resume function for testing
    result = parse_resume(default_resume_path)
    
    print("Parsing Result:")
    print(json.dumps(result, indent=2))
