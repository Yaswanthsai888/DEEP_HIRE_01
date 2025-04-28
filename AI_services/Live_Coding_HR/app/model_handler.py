from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from utils import format_prompt_for_hint, format_prompt_for_followup

model_name = "Salesforce/codegen-350M-mono"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

def generate_hint(code_snippet, task_description):
    prompt = format_prompt_for_hint(task_description, code_snippet)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_length=100)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

def generate_follow_up(task_description):
    prompt = format_prompt_for_followup(task_description)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_length=100)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
