#!/usr/bin/env python3
"""
Audio analysis using Essentia library.
Detects chords, key, and tempo from audio files.
Usage: python detect_chords.py <audio_file_path> [mode]
  mode: 'standard' (default) or 'beat_sync' (beat-synchronous detection)
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
    Detect the tempo (BPM) and beat positions of the audio.
    Returns BPM, confidence, beat count, and array of beat timestamps.
    """
    rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
    bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)

    # Convert beat positions to list of rounded floats
    beat_positions = [round(float(b), 3) for b in beats]

    return {
        'bpm': round(float(bpm), 1),
        'confidence': round(float(beats_confidence), 3),
        'beatCount': len(beats),
        'beats': beat_positions
    }


def detect_chords(audio_path: str) -> list:
    """
    Detect chords from an audio file using Essentia (standard frame-based).
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


def detect_chords_beat_sync(audio_path: str, beats: list) -> list:
    """
    Detect chords from an audio file using beat-synchronous analysis.
    Averages HPCP features over each beat period for more stable detection.
    Returns a list of chord events with timestamps aligned to beats.
    """
    if not beats or len(beats) < 2:
        # Fall back to standard detection if no beats available
        return detect_chords(audio_path)

    # Load audio as mono
    loader = es.MonoLoader(filename=audio_path)
    audio = loader()
    sample_rate = 44100

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

    # Compute one HPCP per beat by averaging frames within each beat
    beat_hpcps = []
    frame_size = 4096
    hop_size = 1024  # Smaller hop for finer resolution within beats

    for i in range(len(beats) - 1):
        beat_start = beats[i]
        beat_end = beats[i + 1]

        # Get audio segment for this beat
        start_sample = int(beat_start * sample_rate)
        end_sample = int(beat_end * sample_rate)

        if end_sample > len(audio):
            end_sample = len(audio)
        if start_sample >= end_sample:
            continue

        beat_audio = audio[start_sample:end_sample]

        # Compute HPCP frames for this beat segment
        frame_hpcps = []
        for frame in es.FrameGenerator(beat_audio, frameSize=min(frame_size, len(beat_audio)), hopSize=hop_size):
            if len(frame) < 256:  # Skip very short frames
                continue
            frame = windowing(frame)
            spec = spectrum(frame)
            peaks_freq, peaks_mag = spectralPeaks(spec)
            h = hpcp(peaks_freq, peaks_mag)
            frame_hpcps.append(h)

        # Average HPCP over this beat
        if frame_hpcps:
            avg_hpcp = np.mean(frame_hpcps, axis=0)
            beat_hpcps.append((beat_start, avg_hpcp))

    if not beat_hpcps:
        return detect_chords(audio_path)

    # Detect chords from beat-synchronous HPCP sequence
    hpcp_array = np.array([h[1] for h in beat_hpcps])
    chordsDetection = es.ChordsDetection()
    chords, strengths = chordsDetection(hpcp_array)

    # Build chord events aligned to beat times
    results = []
    current_chord = None
    chord_start_beat = 0

    for i, chord in enumerate(chords):
        beat_time = beat_hpcps[i][0]

        if chord != current_chord:
            # Save previous chord
            if current_chord is not None:
                results.append({
                    'time': round(chord_start_beat, 3),
                    'chord': parse_chord(current_chord)
                })
            current_chord = chord
            chord_start_beat = beat_time

    # Add final chord
    if current_chord is not None:
        results.append({
            'time': round(chord_start_beat, 3),
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


def analyze_audio(audio_path: str, mode: str = 'standard') -> dict:
    """
    Complete audio analysis: chords, key, and tempo.
    mode: 'standard' for frame-based, 'beat_sync' for beat-synchronous detection.
    """
    # Load audio once for all analyses
    loader = es.MonoLoader(filename=audio_path)
    audio = loader()

    # Detect key and tempo from the full audio
    key_info = detect_key(audio)
    tempo_info = detect_tempo(audio)

    # Detect chords based on mode
    if mode == 'beat_sync' and tempo_info['beats']:
        chords = detect_chords_beat_sync(audio_path, tempo_info['beats'])
    else:
        chords = detect_chords(audio_path)

    return {
        'chords': chords,
        'key': key_info,
        'tempo': tempo_info
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: detect_chords.py <audio_file_path> [mode]'}))
        sys.exit(1)

    audio_path = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else 'standard'

    try:
        analysis = analyze_audio(audio_path, mode)
        print(json.dumps(analysis))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
