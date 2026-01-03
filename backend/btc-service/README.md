# BTC Chord Detection Service

A Google Cloud Run service that uses the **BTC (Bi-directional Transformer for Chord Recognition)** model for high-accuracy chord detection from audio files.

## Overview

This service implements the BTC model from the paper:
> **"A Bi-Directional Transformer for Musical Chord Recognition"** (ISMIR 2019)
> Authors: Jonggwon Park, Kyoyun Choi, Sungwook Jeon, Dokyun Kim, Jonghun Park
> Original Repository: https://github.com/jayg996/BTC-ISMIR19

**Accuracy**: ~90% on standard chord recognition benchmarks (major/minor classification)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BTC Service (Cloud Run)                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Audio Input  │───▶│ CQT Features │───▶│  BTC Model   │      │
│  │ (base64 MP3) │    │ (144 bins)   │    │ (Transformer)│      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                 │                │
│                                                 ▼                │
│                                          ┌──────────────┐       │
│                                          │ Chord Labels │       │
│                                          │ (25 classes) │       │
│                                          └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Model Details

### Hyperparameters (from `run_config.yaml`)

| Parameter | Value | Description |
|-----------|-------|-------------|
| feature_size | 144 | CQT bins (24 bins/octave × 6 octaves) |
| hidden_size | 128 | Transformer hidden dimension |
| num_layers | 8 | Number of bi-directional attention layers |
| num_heads | 4 | Attention heads per layer |
| timestep | 108 | Frames per inference chunk |
| num_chords | 25 | Output classes (12 major + 12 minor + N) |

### Audio Processing

- **Sample Rate**: 22050 Hz
- **CQT Hop Length**: 2048 samples
- **Bins per Octave**: 24
- **Total Bins**: 144 (6 octaves)
- **Feature Normalization**: Using training set mean/std stored in checkpoint

### Chord Vocabulary (25 classes)

```
C, C:min, C#, C#:min, D, D:min, D#, D#:min, E, E:min,
F, F:min, F#, F#:min, G, G:min, G#, G#:min, A, A:min,
A#, A#:min, B, B:min, N (no chord)
```

## API Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "btc-chord-detection",
  "model_loaded": true
}
```

### Analyze Audio

```
POST /analyze
Content-Type: application/json
Authorization: Bearer <GCP_IDENTITY_TOKEN>
```

**Request Body:**
```json
{
  "audio_data": "<base64_encoded_audio>",
  "filename": "song.mp3"
}
```

**Response:**
```json
{
  "chords": [
    {
      "time": 0.0,
      "end_time": 2.5,
      "chord": { "root": "C", "quality": "major" }
    },
    {
      "time": 2.5,
      "end_time": 5.0,
      "chord": { "root": "A", "quality": "minor" }
    }
  ],
  "duration": 180.5,
  "library": "btc",
  "library_info": {
    "name": "BTC (Bi-directional Transformer)",
    "accuracy": "~90%",
    "method": "Transformer + CQT"
  },
  "num_chords": 45
}
```

## File Structure

```
btc-service/
├── main.py                 # Flask API server
├── btc_model.py            # BTC model architecture (from original repo)
├── btc_model.pt            # Pretrained weights (12MB)
├── run_config.yaml         # Model hyperparameters
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container build config
├── cloudbuild.yaml         # Cloud Build config
├── utils/
│   ├── __init__.py
│   ├── transformer_modules.py  # Transformer layers
│   └── hparams.py              # Config loader
├── README.md               # This file
└── TRAINING.md             # Training guide
```

## Deployment

### Prerequisites

1. Google Cloud SDK installed and configured
2. Docker (for local testing)
3. GCP Project with Cloud Run and Artifact Registry enabled

### Environment Variables

Add to your `.env` file:

```bash
# BTC (Bi-directional Transformer) Chord Detection Service (Google Cloud Run)
BTC_SERVICE_URL=https://btc-service-598884178881.us-central1.run.app
```

### Deploy to Cloud Run

```bash
cd backend/btc-service

# Build and push image via Cloud Build
gcloud builds submit --config cloudbuild.yaml --timeout=1800s

# Deploy (if Cloud Build deploy step fails due to permissions)
gcloud run deploy btc-service \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/btc-service:latest \
  --region us-central1 \
  --memory 4Gi \
  --cpu 2 \
  --timeout 600 \
  --concurrency 1
```

### Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Memory | 2GB | 4GB |
| CPU | 1 | 2 |
| Timeout | 300s | 600s |
| Concurrency | 1 | 1 |

**Note**: The service requires 4GB memory to load PyTorch + the model weights + process audio with librosa.

## Local Development

### Setup

```bash
cd backend/btc-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Run locally
python main.py
```

### Test Locally

```bash
# Health check
curl http://localhost:8080/health

# Analyze audio (requires base64 encoded audio)
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{"audio_data": "<base64>", "filename": "test.mp3"}'
```

## Integration with Backend

The backend server (`backend/src/server.ts`) calls the BTC service with GCP identity token authentication:

```typescript
// Get identity token for authenticated Cloud Run call
const identityToken = await getGcpIdentityToken()

const response = await fetch(`${BTC_SERVICE_URL}/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${identityToken}`,
  },
  body: JSON.stringify({
    audio_data: audioBase64,
    filename: `${videoId}.mp3`,
  }),
})
```

## Troubleshooting

### Common Issues

#### 1. Service Unavailable (503)

**Cause**: Memory limit exceeded during model loading or inference.

**Solution**: Increase memory to 4GB:
```bash
gcloud run services update btc-service --memory 4Gi --region us-central1
```

#### 2. YAML Load Error

**Error**: `TypeError: load() missing 1 required positional argument: 'Loader'`

**Solution**: Update `utils/hparams.py` to use:
```python
yaml.load(f, Loader=yaml.FullLoader)
```

#### 3. NumPy Float Error

**Error**: `AttributeError: module 'numpy' has no attribute 'float'`

**Solution**: Update `utils/transformer_modules.py` to use `np.float64` instead of `np.float`.

#### 4. Authentication Error (403)

**Cause**: Missing or invalid identity token.

**Solution**: Ensure the calling service/user has permission to invoke Cloud Run:
```bash
# For local testing, get identity token:
gcloud auth print-identity-token
```

### View Logs

```bash
gcloud run services logs read btc-service --region us-central1 --limit 50
```

## Performance

| Metric | Value |
|--------|-------|
| Cold Start | ~15-20 seconds |
| Warm Inference | ~2-5 seconds per minute of audio |
| Model Size | 12 MB |
| Docker Image Size | ~2.5 GB |

## Comparison with Other Libraries

| Library | Accuracy | Speed | Notes |
|---------|----------|-------|-------|
| **BTC** | ~90% | Medium | Best accuracy, transformer-based |
| Madmom | ~89.6% | Fast | HMM-based, good accuracy |
| Essentia | ~77-80% | Fast | Local processing, no GPU needed |
| Chordino | ~80-81% | Fast | VAMP plugin, lightweight |

## References

- [BTC Paper (arXiv)](https://arxiv.org/abs/1907.02698)
- [Original BTC Code](https://github.com/jayg996/BTC-ISMIR19)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)

## Changelog

### 2026-01-02

- Initial deployment with pretrained weights from original BTC repository
- Fixed compatibility issues with NumPy 1.24+ and PyYAML 6.0+
- Increased memory to 4GB for stable inference
- Added comprehensive documentation
