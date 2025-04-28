# app/utils/ollama_server.py

import subprocess
import requests
import time

OLLAMA_URL = "http://localhost:11434"
MODEL_NAME = "codellama:latest" # Define the model name here

def is_ollama_running():
    """
    Check if Ollama server is running on localhost.
    """
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def is_model_available(model_name):
    """
    Check if the specified model is available in Ollama.
    """
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            tags = response.json().get("models", [])
            return any(model_name in tag.get("name", "") for tag in tags)
        return False
    except requests.exceptions.RequestException:
        return False

def pull_model(model_name):
    """
    Pull the specified model using Ollama CLI.
    """
    print(f"[INFO] Pulling model '{model_name}'...")
    proc = subprocess.run(["ollama", "pull", model_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode == 0:
        print(f"[INFO] Model '{model_name}' pulled successfully.")
        return True
    else:
        print(f"[ERROR] Failed to pull model '{model_name}'.")
        return False

def start_ollama_server(model_name=MODEL_NAME):
    """
    Start the Ollama server in the background if not already running and ensure the model is available.
    """
    print("[INFO] Checking Ollama server status...")
    if not is_ollama_running():
        print("[INFO] Ollama server not running. Starting now...")
        subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(5)
        if is_ollama_running():
            print("[INFO] Ollama server started successfully!")
        else:
            print("[ERROR] Failed to start Ollama server. Please check your setup.")
            return
    else:
        print("[INFO] Ollama server is already running.")

    # Ensure the model is available
    if not is_model_available(model_name):
        print(f"[INFO] Model '{model_name}' not found. Pulling now...")
        if not pull_model(model_name):
            print(f"[ERROR] Could not pull model '{model_name}'.")
        else:
            print(f"[INFO] Model '{model_name}' is ready.")
    else:
        print(f"[INFO] Model '{model_name}' is already available.")
