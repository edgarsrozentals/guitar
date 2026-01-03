# BTC (Bi-directional Transformer) Chord Detection Service
# Lightweight CPU-only build for Cloud Run

FROM python:3.10-slim

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install PyTorch CPU-only (smaller download)
RUN pip install --no-cache-dir \
    torch==2.1.0 \
    --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install other dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./
COPY utils/ ./utils/

# Copy config and pretrained weights
COPY run_config.yaml ./
COPY btc_model.pt ./

# Cloud Run expects the app to listen on PORT env variable
ENV PORT=8080

# Run with gunicorn for production
CMD exec gunicorn --bind :$PORT --workers 1 --threads 4 --timeout 600 main:app
