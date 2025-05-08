import subprocess
import json
import logging
from gtts import gTTS
import speech_recognition as sr
import tempfile
import os
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OllamaInterviewer:
    def __init__(self, model: str = 'mistral'):
        """Initialize with the specified Ollama model name"""
        self.model = model
        self.recognizer = sr.Recognizer()
        logger.info(f"Initializing OllamaInterviewer with model: {model}")

    def text_to_speech(self, text: str) -> bytes:
        """Convert text to speech and return audio bytes"""
        logger.info("Converting question to speech")
        temp_file = None
        try:
            # Create a temporary file with a unique name
            temp_file = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
            temp_path = temp_file.name
            temp_file.close()  # Close the file handle immediately
            
            # Generate and save audio
            tts = gTTS(text=text, lang='en')
            tts.save(temp_path)
            
            # Small delay to ensure file is written
            time.sleep(0.1)
            
            # Read the audio data
            with open(temp_path, 'rb') as audio_file:
                audio_bytes = audio_file.read()
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Error in text_to_speech: {str(e)}")
            raise
            
        finally:
            # Cleanup in finally block to ensure it always runs
            if temp_file:
                try:
                    os.unlink(temp_file.name)
                except Exception as e:
                    logger.warning(f"Could not delete temporary file {temp_file.name}: {str(e)}")

    def speech_to_text(self, audio_data: bytes) -> str:
        """Convert speech to text"""
        logger.info("Converting speech to text")
        try:
            # Save audio data to temporary file (convert to wav if needed)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                # Use speech recognition
                with sr.AudioFile(temp_file.name) as source:
                    audio = self.recognizer.record(source)
                    text = self.recognizer.recognize_google(audio)
                os.unlink(temp_file.name)  # Delete the temporary file
                return text
        except Exception as e:
            logger.error(f"Error in speech_to_text: {str(e)}")
            # Return empty string if audio can't be processed
            return ""

    def get_first_question(self, resume_data: dict) -> dict:
        """Generate the first interview question with audio"""
        logger.info("Generating first interview question")
        # Defensive: use .get with defaults
        skills = ', '.join(resume_data.get('technical_skills', []))
        experience = resume_data.get('experience', '')
        projects = resume_data.get('projects', [])
        project_str = projects[0] if projects else 'No projects listed'
        prompt = (
            "You are an HR interviewer conducting a technical interview. Start with a simple, focused question about the candidate's background or skills. "
            "Do not ask multiple questions at once."
            f"\n- Technical Skills: {skills}\n"
            f"- Experience: {experience}\n"
            f"- Recent Projects: {project_str}\n\n"
            "Ask a clear, specific question that helps evaluate their strongest skills or recent experience."
        )
        try:
            question_text = self._ask_ollama(prompt)
            audio_bytes = self.text_to_speech(question_text)
            return {
                "question": question_text,
                "audio": audio_bytes
            }
        except Exception as e:
            logger.error(f"Error generating first question: {str(e)}")
            raise

    def get_next_question(self, resume_data: dict, history: list) -> dict:
        """Generate follow-up questions based on previous Q&A"""
        logger.info(f"Generating follow-up question. History length: {len(history)}")
        # Defensive: use .get with defaults
        skills = ', '.join(resume_data.get('technical_skills', []))
        last_qa = history[-1] if history else {"question": "No previous question", "answer": "No previous answer"}
        last_question = last_qa.get('question', 'No previous question')
        last_answer = last_qa.get('answer', 'No previous answer')
        prompt = (
            "You are an HR interviewer conducting a technical interview. "
            "For each follow-up, if the previous answer was clear and strong, gradually increase the complexity and depth of your questions. "
            "If the answer was vague or incomplete, ask for more specific details. "
            "Avoid asking multiple questions at once. Only move to complex, multi-part questions if the candidate consistently demonstrates strong expertise. "
            f"\n- Technical Skills: {skills}\n"
            f"- Last Question: {last_question}\n"
            f"- Their Answer: {last_answer}\n\n"
            "Ask the next appropriate question."
        )
        try:
            question_text = self._ask_ollama(prompt)
            audio_bytes = self.text_to_speech(question_text)
            return {
                "question": question_text,
                "audio": audio_bytes
            }
        except Exception as e:
            logger.error(f"Error generating follow-up question: {str(e)}")
            raise

    def get_summary(self, resume_data: dict, history: list) -> dict:
        """Generate a summary and suggestions after the interview"""
        logger.info("Generating interview summary and suggestions")
        skills = ', '.join(resume_data.get('technical_skills', []))
        experience = resume_data.get('experience', '')
        summary_prompt = (
            "You are an HR interviewer. The interview is now complete. "
            "Based on the candidate's resume and their answers to the following questions, provide:\n"
            "1. A brief summary of their overall performance.\n"
            "2. Their strengths.\n"
            "3. Areas for improvement.\n"
            "4. Suggestions for next steps or learning.\n\n"
            f"Resume Skills: {skills}\nExperience: {experience}\n\n"
            "Interview Q&A:\n" + '\n'.join([
                f"Q{i+1}: {qa.get('question', '')}\nA{i+1}: {qa.get('answer', '')}" for i, qa in enumerate(history)
            ])
        )
        try:
            summary_text = self._ask_ollama(summary_prompt)
            audio_bytes = self.text_to_speech(summary_text)
            return {
                "summary": summary_text,
                "audio": audio_bytes
            }
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            raise

    def _ask_ollama(self, prompt: str) -> str:
        """Call Ollama API and handle response"""
        logger.info(f"Calling Ollama with model: {self.model}")
        try:
            cmd = ['ollama', 'run', self.model, prompt]
            logger.debug(f"Running command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            if result.returncode != 0:
                error_msg = f"Ollama command failed: {result.stderr}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
                
            response = result.stdout.strip()
            logger.info("Successfully generated response from Ollama")
            return response
            
        except FileNotFoundError:
            error_msg = "Ollama command not found. Is Ollama installed and in PATH?"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            logger.error(f"Unexpected error in _ask_ollama: {str(e)}")
            raise