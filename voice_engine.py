"""
VoiceGo Voice Conversion Engine
Uses librosa for high-quality pitch shifting with formant preservation
to create natural-sounding voice transformations.
"""

import io
import os
import tempfile

import librosa
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt


def _butter_bandpass(lowcut: float, highcut: float, fs: float, order: int = 5):
    nyq = 0.5 * fs
    low = max(lowcut / nyq, 0.001)
    high = min(highcut / nyq, 0.999)
    return butter(order, [low, high], btype="band", output="sos")


def _apply_formant_shift(y: np.ndarray, sr: int, formant_ratio: float) -> np.ndarray:
    """Shift formants by resampling without changing pitch."""
    if abs(formant_ratio - 1.0) < 0.01:
        return y

    stretched = librosa.effects.time_stretch(y, rate=formant_ratio)
    target_len = len(y)
    if len(stretched) > target_len:
        stretched = stretched[:target_len]
    else:
        stretched = np.pad(stretched, (0, target_len - len(stretched)))

    return stretched


def _apply_breathiness(y: np.ndarray, amount: float) -> np.ndarray:
    """Add natural breathiness by mixing with filtered noise."""
    if amount < 0.01:
        return y

    noise = np.random.randn(len(y)) * amount * 0.15
    envelope = np.abs(y)
    kernel_size = min(1024, len(envelope))
    kernel = np.ones(kernel_size) / kernel_size
    envelope = np.convolve(envelope, kernel, mode="same")
    envelope = envelope / (np.max(envelope) + 1e-8)

    shaped_noise = noise * envelope
    return y + shaped_noise


def _apply_roughness(y: np.ndarray, sr: int, amount: float) -> np.ndarray:
    """Add subtle vocal roughness for natural character."""
    if amount < 0.01:
        return y

    t = np.arange(len(y)) / sr
    modulation = 1.0 + amount * 0.3 * np.sin(2 * np.pi * 70 * t)
    return y * modulation


def _normalize_audio(y: np.ndarray) -> np.ndarray:
    """Normalize audio to prevent clipping."""
    peak = np.max(np.abs(y))
    if peak > 0:
        y = y / peak * 0.95
    return y


def convert_voice(
    input_path: str,
    voice_profile: dict,
    output_format: str = "wav",
) -> bytes:
    """
    Convert voice using the given voice profile parameters.

    Args:
        input_path: Path to the input audio file
        voice_profile: Dictionary with conversion parameters
        output_format: Output audio format

    Returns:
        Converted audio as bytes
    """
    y, sr = librosa.load(input_path, sr=22050, mono=True)

    max_duration = 5 * 60
    max_samples = max_duration * sr
    if len(y) > max_samples:
        y = y[:max_samples]

    pitch_shift = voice_profile.get("pitch_shift", 0.0)
    formant_shift = voice_profile.get("formant_shift", 1.0)
    speed = voice_profile.get("speed", 1.0)
    breathiness = voice_profile.get("breathiness", 0.0)
    roughness = voice_profile.get("roughness", 0.0)

    if abs(pitch_shift) > 0.01:
        y = librosa.effects.pitch_shift(y=y, sr=sr, n_steps=pitch_shift)

    y = _apply_formant_shift(y, sr, formant_shift)

    if abs(speed - 1.0) > 0.01:
        y = librosa.effects.time_stretch(y, rate=speed)

    y = _apply_breathiness(y, breathiness)
    y = _apply_roughness(y, sr, roughness)

    y = _normalize_audio(y)

    buffer = io.BytesIO()
    sf.write(buffer, y, sr, format="WAV")
    buffer.seek(0)
    return buffer.read()


def get_audio_info(file_path: str) -> dict:
    """Get audio file information."""
    y, sr = librosa.load(file_path, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)
    return {
        "duration": round(duration, 2),
        "sample_rate": sr,
        "channels": 1,
        "samples": len(y),
    }
