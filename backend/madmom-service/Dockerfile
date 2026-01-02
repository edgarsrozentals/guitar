# Madmom Chord Detection Service
# Designed for Google Cloud Run

FROM python:3.9-slim

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libffi-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Cython and numpy first (required for madmom build)
# Use numpy 1.23.5 for compatibility with madmom's np.float usage
RUN pip install --no-cache-dir cython numpy==1.23.5

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Cloud Run expects the app to listen on PORT env variable
ENV PORT=8080

# Run with gunicorn for production
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 300 main:app
