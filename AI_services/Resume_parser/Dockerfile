# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Use --no-cache-dir to reduce image size
RUN pip install --no-cache-dir -r requirements.txt

# Download the spaCy English model
RUN python -m spacy download en_core_web_sm

# Copy the rest of the application code into the container at /app
# This includes resume_parser_service.py and Resume_parser.py
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run resume_parser_service.py when the container launches
# Use 0.0.0.0 to make it accessible from outside the container
CMD ["uvicorn", "resume_parser_service:app", "--host", "0.0.0.0", "--port", "8000"]