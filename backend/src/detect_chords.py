#!/usr/bin/env python3
"""
Audio analysis using Essentia library.
Detects chords, key, and tempo from audio files.
Usage: python detect_chords.py <audio_file_path>
Outputs JSON object with chords, key, and tempo to stdout.
"""

import sys
import json
import essentia.standard as es
import numpy as np


def detect_key(audio) -> dict:
    """
    Detect the musical key of the audio.
    Returns key root and scale (major/minor).
    """
    key_extractor = es.KeyExtractor()
    key, scale, strength = key_extractor(audio)

    # Convert flat notes to sharps for consistency
    flat_to_sharp = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    }
    key = flat_to_sharp.get(key, key)

    return {
        'root': key,
        'scale': scale,  # 'major' or 'minor'
        'strength': round(float(strength), 3)
    }


def detect_tempo(audio) -> dict:
    """
    Detect the tempo (BPM) of the audio.
    """
    rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
    bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)

    return {
        'bpm': round(float(bpm), 1),
        'confidence': round(float(beats_confidence), 3),
        'beatCount': len(beats)
    }


def detect_chords(audio_path: str) -> list:
    """
    Detect chords from an audio file using Essentia.
    Returns a list of chord events with timestamps.
    """
    # Load audio as mono
    loader = es.MonoLoader(filename=audio_path)
    audio = loader()

    sample_rate = 44100
    frame_size = 8192
    hop_size = 4096

    # Initialize Essentia algorithms
    windowing = es.Windowing(type='blackmanharris62')
    spectrum = es.Spectrum()
    spectralPeaks = es.SpectralPeaks(
        orderBy='magnitude',
        magnitudeThreshold=0.00001,
        minFrequency=20,
        maxFrequency=3500,
        maxPeaks=60
    )
    hpcp = es.HPCP()
    chordsDetection = es.ChordsDetection()

    # Compute HPCP (Harmonic Pitch Class Profile) for each frame
    hpcps = []
    for frame in es.FrameGenerator(audio, frameSize=frame_size, hopSize=hop_size):
        frame = windowing(frame)
        spec = spectrum(frame)
        peaks_freq, peaks_mag = spectralPeaks(spec)
        h = hpcp(peaks_freq, peaks_mag)
        hpcps.append(h)

    if not hpcps:
        return []

    # Detect chords from HPCP sequence
    hpcp_array = np.array(hpcps)
    chords, strengths = chordsDetection(hpcp_array)

    # Convert to time-based format, merging consecutive same chords
    results = []
    current_chord = None
    chord_start = 0
    min_duration = 0.5  # Minimum chord duration in seconds

    for i, chord in enumerate(chords):
        time = i * hop_size / sample_rate

        if chord != current_chord:
            # Save previous chord if it lasted long enough
            if current_chord is not None and (time - chord_start) >= min_duration:
                results.append({
                    'time': round(chord_start, 2),
                    'chord': parse_chord(current_chord)
                })
            current_chord = chord
            chord_start = time

    # Add final chord
    if current_chord is not None:
        results.append({
            'time': round(chord_start, 2),
            'chord': parse_chord(current_chord)
        })

    return results


def parse_chord(chord_str: str) -> dict:
    """
    Parse Essentia chord string (e.g., 'C#m', 'Ab', 'Bbm') into root and quality.
    """
    if not chord_str or chord_str == 'N':
        return {'root': 'N', 'quality': 'none'}

    # Handle flats - convert to sharps
    flat_to_sharp = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    }

    # Extract root and quality
    if len(chord_str) >= 2 and chord_str[1] in ['b', '#']:
        root = chord_str[:2]
        quality_str = chord_str[2:]
    else:
        root = chord_str[0]
        quality_str = chord_str[1:]

    # Convert flat to sharp
    root = flat_to_sharp.get(root, root)

    # Determine quality
    if quality_str == 'm':
        quality = 'minor'
    elif quality_str == '':
        quality = 'major'
    elif quality_str == 'dim':
        quality = 'dim'
    elif quality_str == 'aug':
        quality = 'aug'
    elif quality_str == '7':
        quality = '7'
    elif quality_str == 'maj7':
        quality = 'maj7'
    elif quality_str == 'm7':
        quality = 'min7'
    else:
        quality = 'major'  # Default

    return {'root': root, 'quality': quality}


def analyze_audio(audio_path: str) -> dict:
    """
    Complete audio analysis: chords, key, and tempo.
    """
    # Load audio once for all analyses
    loader = es.MonoLoader(filename=audio_path)
    audio = loader()

    # Detect key and tempo from the full audio
    key_info = detect_key(audio)
    tempo_info = detect_tempo(audio)

    # Detect chords (this function loads audio internally)
    chords = detect_chords(audio_path)

    return {
        'chords': chords,
        'key': key_info,
        'tempo': tempo_info
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: detect_chords.py <audio_file_path>'}))
        sys.exit(1)

    audio_path = sys.argv[1]

    try:
        analysis = analyze_audio(audio_path)
        print(json.dumps(analysis))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
