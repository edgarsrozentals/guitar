# Madmom Chord Detection Service

A Flask API service that uses the [madmom](https://github.com/CPJKU/madmom) library for high-accuracy chord detection (~89.6% accuracy).

## Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py
```

## Deploy to Google Cloud Run

### Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`

### Deploy

```bash
# From this directory:
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly:
gcloud run deploy madmom-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300s
```

### Get Service URL

After deployment, get the service URL:

```bash
gcloud run services describe madmom-service --region us-central1 --format 'value(status.url)'
```

Add this URL to your `.env` file:

```
MADMOM_SERVICE_URL=https://madmom-service-xxxxx-uc.a.run.app
```

## API Endpoints

### `GET /health`

Health check endpoint.

### `POST /analyze`

Analyze audio for chord detection.

**Request:**
```json
{
  "audio_data": "base64 encoded audio file",
  "filename": "song.mp3"
}
```

**Response:**
```json
{
  "chords": [
    {"time": 0.0, "chord": {"root": "C", "quality": "major"}},
    {"time": 2.5, "chord": {"root": "G", "quality": "major"}}
  ],
  "library": "madmom",
  "library_info": {
    "name": "Madmom",
    "accuracy": "89.6%",
    "method": "Deep Chroma + CRF"
  }
}
```

## Technical Details

- Uses madmom's `DeepChromaProcessor` for feature extraction
- Uses `DeepChromaChordRecognitionProcessor` for chord recognition
- Filters out chords shorter than 0.5 seconds
- Normalizes chord qualities and converts flats to sharps
