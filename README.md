# VoiceGo - Indian Voice Conversion Platform

Transform your voice with **20 authentic Indian voice profiles** - real college-age voices, not robotic synthesizers.

## Features

- **20 Voice Profiles** - 10 male + 10 female Indian voice profiles (college-age, natural sounding)
- **Voice Upload** - Upload audio files (WAV, MP3, OGG, WebM, M4A, FLAC) up to 5 minutes
- **In-Browser Recording** - Record directly from your browser with real-time waveform visualization
- **Natural Voice Conversion** - Advanced pitch shifting with formant preservation for human-like results
- **Male-to-Female & Female-to-Male** - Convert between genders with authentic vocal characteristics
- **Regional Accents** - Hindi, Punjabi, Bengali, Tamil, Marathi, Gujarati, Kannada, Telugu accents
- **Instant Download** - Download converted WAV files immediately

## Voice Profiles

### Boys (10)
| Name | Age | Accent | Style |
|------|-----|--------|-------|
| Arjun | 20 | Hindi | Deep, confident |
| Rahul | 19 | Hindi | Friendly, approachable |
| Vikram | 22 | Punjabi | Low, authoritative |
| Rohan | 18 | Hindi | Youthful, energetic |
| Aditya | 21 | Marathi | Smooth, charismatic |
| Karan | 20 | Hindi | Calm, soothing |
| Dev | 22 | Bengali | Husky, character |
| Sahil | 19 | Gujarati | Soft-spoken, warm |
| Aarav | 18 | Hindi | Bright, youthful |
| Nikhil | 21 | Tamil | Clear, articulate |

### Girls (10)
| Name | Age | Accent | Style |
|------|-----|--------|-------|
| Priya | 19 | Hindi | Sweet, melodious |
| Ananya | 20 | Hindi | Soft, calming |
| Ishita | 21 | Marathi | Clear, confident |
| Kavya | 19 | Kannada | Melodious, musical |
| Neha | 22 | Hindi | Warm, emotional |
| Riya | 18 | Hindi | Youthful, bubbly |
| Simran | 20 | Punjabi | Expressive, dynamic |
| Tanvi | 19 | Telugu | Gentle, whispery |
| Diya | 18 | Hindi | Bright, sparkling |
| Meera | 21 | Bengali | Rich, sophisticated |

## Tech Stack

- **Backend**: Python, FastAPI, librosa, soundfile, scipy
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Web Audio API
- **Voice Engine**: STFT-based pitch shifting, formant preservation, breathiness/roughness modeling

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Install system dependency for audio processing
sudo apt-get install -y libsndfile1

# Run the server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000 in your browser.

## How It Works

1. **Choose a Voice** - Pick from 20 Indian voice profiles
2. **Upload or Record** - Upload an audio file or record in-browser (max 5 minutes)
3. **Convert & Download** - Get your transformed voice instantly

## Voice Conversion Technology

VoiceGo uses advanced DSP techniques for natural-sounding voice conversion:

- **Pitch Shifting** - STFT-based pitch shifting via librosa for high-quality frequency modification
- **Formant Preservation** - Adjusts formants independently to maintain natural vocal quality
- **Breathiness Modeling** - Adds natural breathing characteristics using envelope-shaped noise
- **Roughness Modeling** - Subtle vocal roughness for character and authenticity
- **Normalization** - Prevents clipping while maintaining dynamic range

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main web interface |
| GET | `/api/voices` | List all voice profiles |
| GET | `/api/voices/{id}` | Get specific voice profile |
| POST | `/api/convert` | Convert uploaded audio |
| GET | `/api/download/{id}` | Download converted audio |

## License

MIT
