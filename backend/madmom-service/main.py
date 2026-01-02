"""
Madmom Chord Detection Service

A Flask API that uses the madmom library for high-accuracy chord detection.
Designed to run on Google Cloud Run.
"""

import os
import base64
import tempfile
import json
from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

# Lazy load madmom to avoid import errors during container startup
_madmom_loaded = False
_chord_processor = None


def load_madmom():
    """Lazily load madmom and initialize the chord processor."""
    global _madmom_loaded, _chord_processor
    if _madmom_loaded:
        return

    import madmom
    from madmom.features.chords import DeepChromaChordRecognitionProcessor
    from madmom.audio.chroma import DeepChromaProcessor

    # Initialize the deep chroma chord recognition processor
    _chord_processor = DeepChromaChordRecognitionProcessor()
    _madmom_loaded = True
    print("Madmom loaded successfully")


def parse_chord_label(label: str) -> dict:
    """
    Parse a madmom chord label into root and quality.
    Madmom outputs labels like: 'C:maj', 'A:min', 'G:7', 'N' (no chord)
    """
    if label == 'N' or label == '':
        return {'root': 'N', 'quality': 'none'}

    parts = label.split(':')
    root = parts[0] if parts else 'N'
    quality = parts[1] if len(parts) > 1 else 'major'

    # Normalize quality names
    quality_map = {
        'maj': 'major',
        'min': 'minor',
        'dim': 'dim',
        'aug': 'aug',
        '7': '7',
        'maj7': 'maj7',
        'min7': 'min7',
        'dim7': 'dim7',
        'hdim7': 'min7b5',
        'sus2': 'sus2',
        'sus4': 'sus4',
    }

    normalized_quality = quality_map.get(quality, quality)

    # Normalize root note (convert flats to sharps)
    flat_to_sharp = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    }
    normalized_root = flat_to_sharp.get(root, root)

    return {'root': normalized_root, 'quality': normalized_quality}


def detect_chords(audio_path: str) -> list:
    """
    Detect chords in an audio file using madmom's deep chroma processor.
    Returns a list of chord events with timestamps.
    """
    import madmom
    from madmom.features.chords import DeepChromaChordRecognitionProcessor
    from madmom.audio.chroma import DeepChromaProcessor

    # Process the audio file
    dcp = DeepChromaProcessor()
    chroma = dcp(audio_path)

    # Recognize chords
    chord_processor = DeepChromaChordRecognitionProcessor()
    chords = chord_processor(chroma)

    # Convert to our format
    # Madmom returns: [(start_time, end_time, chord_label), ...]
    chord_events = []
    min_duration = 0.5  # Minimum chord duration in seconds

    for i, (start, end, label) in enumerate(chords):
        duration = end - start
        if duration < min_duration:
            continue

        chord = parse_chord_label(label)
        if chord['root'] == 'N':
            continue

        # Avoid duplicate consecutive chords
        if chord_events and chord_events[-1]['chord'] == chord:
            continue

        chord_events.append({
            'time': float(start),
            'chord': chord
        })

    return chord_events


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Cloud Run."""
    return jsonify({'status': 'ok', 'service': 'madmom-chord-detection'})


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
        load_madmom()

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

        # Write to temp file for madmom processing
        suffix = os.path.splitext(filename)[1] or '.mp3'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Detect chords
            chords = detect_chords(tmp_path)

            return jsonify({
                'chords': chords,
                'library': 'madmom',
                'library_info': {
                    'name': 'Madmom',
                    'accuracy': '89.6%',
                    'method': 'Deep Chroma + CRF'
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
