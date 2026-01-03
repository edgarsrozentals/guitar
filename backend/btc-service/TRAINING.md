# BTC Model Training Overview

## What is BTC?

BTC (Bi-directional Transformer for Chord Recognition) is a deep learning model from the paper:
> "A Bi-Directional Transformer for Musical Chord Recognition" (ISMIR 2019)
> Authors: Jonggwon Park, Kyoyun Choi, Sungwook Jeon, Dokyun Kim, Jonghun Park

**Original Repository**: https://github.com/jayg996/BTC-ISMIR19

---

## Option 1: Use Pretrained Weights (Easiest)

### Download Official Pretrained Model

The original authors provide pretrained weights:

```bash
# Clone the original repo
git clone https://github.com/jayg996/BTC-ISMIR19.git
cd BTC-ISMIR19

# The pretrained model is in:
# - model/btc_model.pt (or similar)
```

### Convert to Our Format

Our model architecture may differ slightly. To use their weights:

1. Download their checkpoint
2. Map the weights to our model structure
3. Save as `btc_weights.pt`

```python
import torch

# Load original weights
original = torch.load('path/to/btc_model.pt', map_location='cpu')

# Our model
from btc_model import BTCModel
model = BTCModel(n_chords=25, d_model=256, n_heads=8, n_layers=6)

# Map weights (may need adjustment based on naming)
model.load_state_dict(original, strict=False)

# Save for our service
torch.save(model.state_dict(), 'btc_weights.pt')
```

### Deploy Weights to Cloud Run

```bash
# Option A: Build into Docker image
# Add to Dockerfile:
COPY btc_weights.pt /app/models/

# Option B: Download at runtime from GCS
# Modify main.py to download from gs://your-bucket/btc_weights.pt
```

---

## Option 2: Train Your Own Model

### Required Dataset

The standard dataset for chord recognition is **Billboard Dataset**:
- ~700 songs with chord annotations
- Available at: https://ddmal.music.mcgill.ca/research/The_McGill_Billboard_Project_(Conditions_for_Use)

Other datasets:
- **Isophonics** (Beatles, Queen, etc.)
- **RWC Popular Music Database**
- **JAAH** (Jazz Audio-Aligned Harmony)

### Training Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Audio Files    │────▶│  Feature Extract │────▶│  CQT Spectrograms│
│  (.mp3, .wav)   │     │  (librosa)       │     │  (time x 84 bins)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Chord Labels   │────▶│  Align & Encode  │────▶│  Label Sequence │
│  (.lab files)   │     │                  │     │  (time x 1)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Train Model    │
                                                 │  (PyTorch)      │
                                                 └─────────────────┘
```

### Training Script

```python
# train_btc.py
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from btc_model import BTCModel
import librosa
import numpy as np

# Hyperparameters
BATCH_SIZE = 16
LEARNING_RATE = 1e-4
EPOCHS = 100
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Chord vocabulary (25 classes)
CHORD_LABELS = [
    'N', 'C:maj', 'C:min', 'C#:maj', 'C#:min',
    'D:maj', 'D:min', 'D#:maj', 'D#:min',
    'E:maj', 'E:min', 'F:maj', 'F:min',
    'F#:maj', 'F#:min', 'G:maj', 'G:min',
    'G#:maj', 'G#:min', 'A:maj', 'A:min',
    'A#:maj', 'A#:min', 'B:maj', 'B:min',
]

class ChordDataset(torch.utils.data.Dataset):
    def __init__(self, audio_paths, label_paths):
        self.audio_paths = audio_paths
        self.label_paths = label_paths

    def __len__(self):
        return len(self.audio_paths)

    def __getitem__(self, idx):
        # Extract CQT features
        y, sr = librosa.load(self.audio_paths[idx], sr=22050)
        cqt = librosa.cqt(y, sr=sr, hop_length=512, n_bins=84)
        cqt_db = librosa.amplitude_to_db(np.abs(cqt))
        features = torch.FloatTensor(cqt_db.T)  # (time, 84)

        # Load and align labels
        labels = self.load_labels(self.label_paths[idx], features.shape[0])

        return features, labels

    def load_labels(self, label_path, n_frames):
        # Parse .lab file and align to frames
        # Returns tensor of shape (n_frames,) with chord indices
        pass  # Implementation depends on label format

def train():
    # Initialize model
    model = BTCModel(
        n_chords=len(CHORD_LABELS),
        d_model=256,
        n_heads=8,
        n_layers=6
    ).to(DEVICE)

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(ignore_index=-1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, EPOCHS)

    # Training loop
    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0

        for features, labels in dataloader:
            features = features.to(DEVICE)
            labels = labels.to(DEVICE)

            optimizer.zero_grad()
            logits = model(features)
            loss = criterion(logits.view(-1, len(CHORD_LABELS)), labels.view(-1))
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        scheduler.step()
        print(f"Epoch {epoch+1}/{EPOCHS}, Loss: {total_loss:.4f}")

    # Save model
    torch.save(model.state_dict(), 'btc_weights.pt')

if __name__ == '__main__':
    train()
```

### Training Time Estimates

| Hardware | Time per Epoch | Total (100 epochs) |
|----------|---------------|-------------------|
| CPU (M1 Mac) | ~30 min | ~50 hours |
| GPU (RTX 3080) | ~2 min | ~3 hours |
| Cloud (A100) | ~30 sec | ~1 hour |

---

## Option 3: Use Alternative Pretrained Models

### Madmom (Already Deployed)
You already have Madmom deployed which achieves 89.6% accuracy. This might be sufficient.

### Chordino
- Accuracy: ~80-81%
- Lighter weight, easier to deploy
- Available via VAMP plugins

### chord-extractor (Python package)
```bash
pip install chord-extractor
```
Wraps multiple backends including Chordino.

---

## Automation Options

### GitHub Actions Training Pipeline

```yaml
# .github/workflows/train-btc.yml
name: Train BTC Model

on:
  workflow_dispatch:  # Manual trigger
  schedule:
    - cron: '0 0 1 * *'  # Monthly retraining

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install torch librosa numpy

      - name: Download dataset
        run: |
          # Download Billboard dataset (requires access)
          wget https://your-storage/billboard-dataset.zip
          unzip billboard-dataset.zip

      - name: Train model
        run: python train_btc.py

      - name: Upload weights
        uses: google-github-actions/upload-cloud-storage@v1
        with:
          path: btc_weights.pt
          destination: your-bucket/models/

      - name: Redeploy service
        run: |
          gcloud run deploy btc-service \
            --image us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/btc-service
```

### Google Cloud Vertex AI Training

```bash
# Submit training job to Vertex AI
gcloud ai custom-jobs create \
  --region=us-central1 \
  --display-name=btc-training \
  --worker-pool-spec=machine-type=n1-standard-8,accelerator-type=NVIDIA_TESLA_T4,accelerator-count=1,container-image-uri=gcr.io/your-project/btc-training
```

---

## Quick Start: Get Running Today

### Fastest Path to Accurate BTC

1. **Clone original repo and get their weights**:
```bash
git clone https://github.com/jayg996/BTC-ISMIR19.git
cd BTC-ISMIR19
# Check for pretrained model files
ls -la *.pt *.pth model/
```

2. **If weights exist, upload to your service**:
```bash
# Upload to GCS
gsutil cp btc_model.pt gs://your-bucket/models/btc_weights.pt

# Update main.py to download from GCS on startup
```

3. **If no weights, use their full implementation instead**:
   - Their repo includes the complete training pipeline
   - Run their training script on the Billboard dataset
   - Export weights when done

---

## Recommendation

Given your current setup:

1. **Short term**: Use Madmom (already working at 89.6% accuracy)
2. **Medium term**: Try to get pretrained BTC weights from the original authors
3. **Long term**: Train your own model if you need custom chord vocabulary

The BTC service is deployed and ready - it just needs pretrained weights to produce accurate results.

---

## Resources

- **BTC Paper**: https://arxiv.org/abs/1907.02698
- **Original Code**: https://github.com/jayg996/BTC-ISMIR19
- **Billboard Dataset**: https://ddmal.music.mcgill.ca/research/The_McGill_Billboard_Project
- **Isophonics Annotations**: http://isophonics.net/content/reference-annotations
- **mirdata** (Python library for MIR datasets): https://mirdata.readthedocs.io/
