"""
BTC (Bi-directional Transformer) Chord Detection Service
Uses pretrained weights from the original BTC-ISMIR19 paper.
"""

import os
import base64
import tempfile
import warnings
import numpy as np
import torch
import librosa
from flask import Flask, request, jsonify

warnings.filterwarnings('ignore')

app = Flask(__name__)

# Global model and config
model = None
mean = None
std = None
config = None
device = torch.device("cpu")

# Chord labels (25 classes: major/minor for each note + N for no chord)
idx2chord = ['C', 'C:min', 'C#', 'C#:min', 'D', 'D:min', 'D#', 'D#:min', 'E', 'E:min', 'F', 'F:min', 'F#',
             'F#:min', 'G', 'G:min', 'G#', 'G#:min', 'A', 'A:min', 'A#', 'A#:min', 'B', 'B:min', 'N']


def load_model():
    """Load the BTC model and pretrained weights."""
    global model, mean, std, config

    from utils.hparams import HParams
    from btc_model import BTC_model

    # Load config
    config_path = os.path.join(os.path.dirname(__file__), 'run_config.yaml')
    config = HParams.load(config_path)

    # Create model
    model = BTC_model(config=config.model).to(device)

    # Load pretrained weights
    model_path = os.path.join(os.path.dirname(__file__), 'btc_model.pt')
    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        mean = checkpoint['mean']
        std = checkpoint['std']
        model.load_state_dict(checkpoint['model'])
        model.eval()
        print(f"Loaded pretrained BTC model from {model_path}")
        return True
    else:
        print(f"Warning: No pretrained weights found at {model_path}")
        return False


def audio_file_to_features(audio_file, config):
    """Extract CQT features from audio file (from original BTC code)."""
    original_wav, sr = librosa.load(audio_file, sr=config.mp3['song_hz'], mono=True)
    currunt_sec_hz = 0
    feature = None

    while len(original_wav) > currunt_sec_hz + config.mp3['song_hz'] * config.mp3['inst_len']:
        start_idx = int(currunt_sec_hz)
        end_idx = int(currunt_sec_hz + config.mp3['song_hz'] * config.mp3['inst_len'])
        tmp = librosa.cqt(original_wav[start_idx:end_idx], sr=sr,
                         n_bins=config.feature['n_bins'],
                         bins_per_octave=config.feature['bins_per_octave'],
                         hop_length=config.feature['hop_length'])
        if feature is None:
            feature = tmp
        else:
            feature = np.concatenate((feature, tmp), axis=1)
        currunt_sec_hz = end_idx

    # Process remaining audio
    if len(original_wav) > currunt_sec_hz:
        tmp = librosa.cqt(original_wav[currunt_sec_hz:], sr=sr,
                         n_bins=config.feature['n_bins'],
                         bins_per_octave=config.feature['bins_per_octave'],
                         hop_length=config.feature['hop_length'])
        if feature is None:
            feature = tmp
        else:
            feature = np.concatenate((feature, tmp), axis=1)

    feature = np.log(np.abs(feature) + 1e-6)
    feature_per_second = config.mp3['inst_len'] / config.model['timestep']
    song_length_second = len(original_wav) / config.mp3['song_hz']

    return feature, feature_per_second, song_length_second


def predict_chords(audio_path):
    """Run chord prediction on audio file."""
    global model, mean, std, config

    if model is None:
        raise RuntimeError("Model not loaded")

    # Extract features
    feature, feature_per_second, song_length_second = audio_file_to_features(audio_path, config)

    # Transpose and normalize
    feature = feature.T
    feature = (feature - mean) / std
    time_unit = feature_per_second
    n_timestep = config.model['timestep']

    # Pad to multiple of timestep
    num_pad = n_timestep - (feature.shape[0] % n_timestep)
    if num_pad < n_timestep:
        feature = np.pad(feature, ((0, num_pad), (0, 0)), mode="constant", constant_values=0)
    num_instance = feature.shape[0] // n_timestep

    # Run inference
    chords = []
    start_time = 0.0
    prev_chord = None

    with torch.no_grad():
        model.eval()
        feature_tensor = torch.tensor(feature, dtype=torch.float32).unsqueeze(0).to(device)

        for t in range(num_instance):
            # Get chunk for this timestep
            chunk = feature_tensor[:, n_timestep * t:n_timestep * (t + 1), :]

            # Run through model
            self_attn_output, _ = model.self_attn_layers(chunk)
            prediction, _ = model.output_layer(self_attn_output)
            prediction = prediction.squeeze()

            for i in range(n_timestep):
                current_time = time_unit * (n_timestep * t + i)

                # Skip beyond song length
                if current_time > song_length_second:
                    break

                chord_idx = prediction[i].item()

                if prev_chord is None:
                    prev_chord = chord_idx
                    start_time = current_time
                    continue

                if chord_idx != prev_chord:
                    # Record the previous chord
                    chord_label = idx2chord[prev_chord]
                    if chord_label != 'N':  # Skip "no chord"
                        chords.append({
                            'time': start_time,
                            'end_time': current_time,
                            'chord': parse_chord_label(chord_label)
                        })
                    start_time = current_time
                    prev_chord = chord_idx

        # Add final chord
        if prev_chord is not None:
            chord_label = idx2chord[prev_chord]
            if chord_label != 'N':
                chords.append({
                    'time': start_time,
                    'end_time': song_length_second,
                    'chord': parse_chord_label(chord_label)
                })

    return chords, song_length_second


def parse_chord_label(label):
    """Convert BTC chord label to our format."""
    if label == 'N':
        return {'root': 'N', 'quality': 'none'}

    if ':min' in label:
        root = label.replace(':min', '')
        quality = 'minor'
    else:
        root = label
        quality = 'major'

    # Normalize root note names (sharps to flats for consistency)
    root_map = {
        'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
    }
    root = root_map.get(root, root)

    return {'root': root, 'quality': quality}


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'btc-chord-detection',
        'model_loaded': model is not None
    })


@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze audio for chord detection."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'audio_data' not in data:
            return jsonify({'error': 'audio_data field required'}), 400

        # Decode base64 audio
        audio_bytes = base64.b64decode(data['audio_data'])
        filename = data.get('filename', 'audio.mp3')

        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            # Run prediction
            chords, duration = predict_chords(temp_path)

            return jsonify({
                'chords': chords,
                'duration': duration,
                'library': 'btc',
                'library_info': {
                    'name': 'BTC (Bi-directional Transformer)',
                    'accuracy': '~90%',
                    'method': 'Transformer + CQT'
                },
                'num_chords': len(chords)
            })
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# Load model at startup
print("Loading BTC model...")
load_model()
print("BTC service ready")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
