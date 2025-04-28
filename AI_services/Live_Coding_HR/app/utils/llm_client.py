# app/utils/llm_utils.py

import requests

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "codellama:latest"

def call_ollama(prompt):
    """
    Helper function to call local Ollama server with the given prompt.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False  # stream=False for full output in one go
    }
    try:
        response = requests.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get('response', '').strip()
    except requests.exceptions.RequestException as e:
        print(f"Ollama API call failed: {e}")
        return "Error: Unable to get response from AI."

def format_context(context):
    """Format the conversation context for inclusion in the prompt."""
    if not context:
        return ""
    formatted = "\n".join([
        f"User: {item['user']}\nAI: {item['ai']}" for item in context
    ])
    return f"Conversation so far:\n{formatted}\n"

def get_hint(question, code_so_far, context=None):
    """
    Generate a hint based on the current code, the question, and optional conversation context.
    """
    context_str = format_context(context)
    prompt = (
        f"{context_str}"
        f"Candidate is solving the question titled '{question['title']}'.\n"
        f"Current code written so far:\n{code_so_far}\n"
        "Please provide a helpful hint without giving the full answer as he is writing a test you are an Live HR who will be working as helpul hints but not answer."
    )
    return call_ollama(prompt)

def get_live_feedback(code_so_far, context=None):
    """
    Give live feedback during the coding session based on partial code and optional context.
    """
    if not code_so_far.strip():
        return "You haven't started coding yet. Try writing a function signature!"
    context_str = format_context(context)
    prompt = (
        f"{context_str}"
        "You are monitoring a live coding session.\n"
        f"Here is the candidate's partial code:\n{code_so_far}\n"
        "Give a quick encouraging feedback and one small improvement suggestion."
    )
    return call_ollama(prompt)

def get_submission_feedback(code, question):
    """
    Give feedback after final submission, focusing on correctness and improvements.
    """
    prompt = (
        f"The candidate submitted this code for the question titled '{question['title']}'.\n"
        f"Submitted code:\n{code}\n"
        "Please review the code and give feedback mentioning:\n"
        "- If it seems correct.\n"
        "- Possible improvements.\n"
        "- Edge cases they might miss."
    )
    return call_ollama(prompt)

def get_followup_suggestion(code, question, context=None):
    """
    Analyzes correct code and suggests an optimization or alternative approach as a follow-up task.
    Returns the suggestion text or None if no suitable follow-up is found.
    """
    context_str = format_context(context)
    prompt = (
        f"{context_str}"
        f"The candidate submitted the following code which correctly solves the question: '{question['title']}'.\n"
        f"Correct Code:\n{code}\n\n"
        "Analyze this code. Is there a significantly more optimal approach (e.g., better time/space complexity) "
        "or a common alternative way to solve it? \n"
        "If YES, briefly describe the alternative/optimized approach and formulate a clear follow-up task asking the candidate to implement it. "
        "Example: 'Your solution works! As a follow-up, can you implement this using dynamic programming to potentially improve performance?'\n"
        "If NO (the code is already optimal or no clear alternative task exists), respond ONLY with the exact text: 'NO_FOLLOWUP'."
    )
    suggestion = call_ollama(prompt)
    if suggestion.strip() == "NO_FOLLOWUP":
        return None
    return suggestion
