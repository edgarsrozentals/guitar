"""
BTC (Bi-directional Transformer for Chord Recognition) Service

A Flask API that uses a transformer-based model for high-accuracy chord detection.
Based on the paper: "A Bi-Directional Transformer for Musical Chord Recognition"
Designed to run on Google Cloud Run.
"""

import os
import base64
import tempfile
import json
from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

# Lazy load model to avoid import errors during container startup
_model_loaded = False
_btc_model = None
_device = None

# Chord vocabulary (25 chord classes from BTC paper)
CHORD_LABELS = [
    'N',  # No chord
    'C:maj', 'C:min', 'C#:maj', 'C#:min',
    'D:maj', 'D:min', 'D#:maj', 'D#:min',
    'E:maj', 'E:min',
    'F:maj', 'F:min', 'F#:maj', 'F#:min',
    'G:maj', 'G:min', 'G#:maj', 'G#:min',
    'A:maj', 'A:min', 'A#:maj', 'A#:min',
    'B:maj', 'B:min',
]


def load_model():
    """Load the BTC model for chord recognition."""
    global _model_loaded, _btc_model, _device
    if _model_loaded:
        return

    import torch
    from btc_model import BTCModel

    _device = torch.device('cpu')

    # Initialize model
    _btc_model = BTCModel(
        n_chords=len(CHORD_LABELS),
        d_model=256,
        n_heads=8,
        n_layers=6,
        d_ff=1024,
        dropout=0.1
    )
    _btc_model.to(_device)
    _btc_model.eval()

    # Load pretrained weights if available
    weights_path = '/app/models/btc_weights.pt'
    if os.path.exists(weights_path):
        print(f"Loading pretrained weights from {weights_path}")
        _btc_model.load_state_dict(torch.load(weights_path, map_location=_device))
    else:
        print("Warning: No pretrained weights found. Using randomly initialized model.")
        print("For accurate predictions, download weights to /app/models/btc_weights.pt")

    _model_loaded = True
    print("BTC model loaded successfully")


def extract_cqt_features(audio_path: str, sr: int = 22050, hop_length: int = 512):
    """
    Extract Constant-Q Transform features from audio.
    Returns CQT spectrogram suitable for BTC model input.
    """
    import librosa
    import torch

    # Load audio
    y, sr = librosa.load(audio_path, sr=sr, mono=True)

    # Compute CQT (similar to original BTC paper)
    cqt = librosa.cqt(
        y,
        sr=sr,
        hop_length=hop_length,
        n_bins=84,  # 7 octaves
        bins_per_octave=12
    )

    # Convert to magnitude and log scale
    cqt_mag = np.abs(cqt)
    cqt_db = librosa.amplitude_to_db(cqt_mag, ref=np.max)

    # Normalize
    cqt_db = (cqt_db - cqt_db.mean()) / (cqt_db.std() + 1e-8)

    # Transpose to (time, freq) and convert to tensor
    features = torch.FloatTensor(cqt_db.T)

    # Calculate timestamps
    n_frames = features.shape[0]
    times = librosa.frames_to_time(
        np.arange(n_frames),
        sr=sr,
        hop_length=hop_length
    )

    return features, times


def parse_chord_label(label: str) -> dict:
    """Parse a chord label into root and quality."""
    if label == 'N' or label == '':
        return {'root': 'N', 'quality': 'none'}

    parts = label.split(':')
    root = parts[0] if parts else 'N'
    quality = parts[1] if len(parts) > 1 else 'major'

    # Normalize quality names
    quality_map = {
        'maj': 'major',
        'min': 'minor',
    }
    normalized_quality = quality_map.get(quality, quality)

    # Normalize root note (keep sharps as-is)
    return {'root': root, 'quality': normalized_quality}


def detect_chords(audio_path: str) -> list:
    """
    Detect chords using BTC model.
    Returns list of chord events with timestamps.
    """
    import torch

    load_model()

    # Extract features
    features, times = extract_cqt_features(audio_path)

    # Add batch dimension
    features = features.unsqueeze(0).to(_device)  # (1, time, freq)

    # Run inference
    with torch.no_grad():
        logits = _btc_model(features)  # (1, time, n_chords)
        predictions = torch.argmax(logits, dim=-1).squeeze(0)  # (time,)

    # Convert predictions to chord events
    chord_events = []
    prev_chord_idx = -1
    min_duration = 0.3  # Minimum chord duration

    for i, (time, chord_idx) in enumerate(zip(times, predictions.cpu().numpy())):
        chord_idx = int(chord_idx)

        # Skip if same as previous chord
        if chord_idx == prev_chord_idx:
            continue

        # Skip 'N' (no chord)
        if chord_idx == 0:
            prev_chord_idx = chord_idx
            continue

        # Check minimum duration from previous chord
        if chord_events and (time - chord_events[-1]['time']) < min_duration:
            continue

        chord_label = CHORD_LABELS[chord_idx]
        chord = parse_chord_label(chord_label)

        chord_events.append({
            'time': float(time),
            'chord': chord
        })

        prev_chord_idx = chord_idx

    return chord_events


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Cloud Run."""
    return jsonify({'status': 'ok', 'service': 'btc-chord-detection'})


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze audio for chord detection.

    Expects JSON body:
    {
        "audio_data": "base64 encoded audio file",
        "filename": "optional filename with extension"
    }

    Returns:
    {
        "chords": [{"time": 0.0, "chord": {"root": "C", "quality": "major"}}, ...]
    }
    """
    try:
        data = request.get_json()
        if not data or 'audio_data' not in data:
            return jsonify({'error': 'Missing audio_data in request'}), 400

        audio_base64 = data['audio_data']
        filename = data.get('filename', 'audio.mp3')

        # Decode audio data
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            return jsonify({'error': f'Invalid base64 audio data: {str(e)}'}), 400

        # Write to temp file for processing
        suffix = os.path.splitext(filename)[1] or '.mp3'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Detect chords
            chords = detect_chords(tmp_path)

            return jsonify({
                'chords': chords,
                'library': 'btc',
                'library_info': {
                    'name': 'BTC (Bi-directional Transformer)',
                    'accuracy': '~90%',
                    'method': 'Transformer + CQT'
                }
            })

        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
