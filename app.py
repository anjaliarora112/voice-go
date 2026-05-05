"""
VoiceGo - Indian Voice Conversion Platform
FastAPI backend for real-time voice transformation.
"""

import os
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

from voice_engine import convert_voice, get_audio_info
from voice_profiles import ALL_VOICES, FEMALE_VOICES, MALE_VOICES, get_voice_by_id

app = FastAPI(title="VoiceGo", description="Indian Voice Conversion Platform")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".ogg", ".webm", ".m4a", ".flac", ".aac"}
MAX_DURATION_SECONDS = 300  # 5 minutes


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "male_voices": MALE_VOICES,
            "female_voices": FEMALE_VOICES,
        },
    )


@app.get("/api/voices")
async def list_voices():
    return {
        "male": MALE_VOICES,
        "female": FEMALE_VOICES,
        "total": len(ALL_VOICES),
    }


@app.get("/api/voices/{voice_id}")
async def get_voice(voice_id: str):
    voice = get_voice_by_id(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    return voice


@app.post("/api/convert")
async def convert(
    audio: UploadFile = File(...),
    voice_id: str = Form(...),
):
    voice = get_voice_by_id(voice_id)
    if not voice:
        raise HTTPException(status_code=400, detail="Invalid voice selection")

    ext = os.path.splitext(audio.filename or "file.wav")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    file_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}_input{ext}")
    output_path = os.path.join(UPLOAD_DIR, f"{file_id}_output.wav")

    content = await audio.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB.")

    with open(input_path, "wb") as f:
        f.write(content)

    try:
        info = get_audio_info(input_path)
        if info["duration"] > MAX_DURATION_SECONDS:
            raise HTTPException(
                status_code=400,
                detail="Audio too long. Maximum duration is 5 minutes.",
            )

        converted_bytes = convert_voice(input_path, voice)

        with open(output_path, "wb") as f:
            f.write(converted_bytes)

        return JSONResponse(
            {
                "status": "success",
                "file_id": file_id,
                "original_duration": info["duration"],
                "voice_used": voice["name"],
                "download_url": f"/api/download/{file_id}",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.get("/api/download/{file_id}")
async def download(file_id: str):
    output_path = os.path.join(UPLOAD_DIR, f"{file_id}_output.wav")
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename=f"voicego_converted_{file_id[:8]}.wav",
    )


@app.delete("/api/cleanup/{file_id}")
async def cleanup(file_id: str):
    for suffix in ["_input.wav", "_output.wav"]:
        path = os.path.join(UPLOAD_DIR, f"{file_id}{suffix}")
        if os.path.exists(path):
            os.remove(path)
    return {"status": "cleaned"}
