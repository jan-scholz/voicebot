import asyncio
import io
import json
import os
import queue
import uuid

import azure.cognitiveservices.speech as speechsdk

# import soundfile as sf
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import JSONResponse

from aas.utils.speech_recognizer import AzureSpeechRecognizer

# from faster_whisper import WhisperModel


load_dotenv()

# model = WhisperModel("base.en", compute_type="auto")
speech_config = speechsdk.SpeechConfig(
    subscription=os.environ.get("SPEECH_KEY"),
    region=os.environ.get("SPEECH_REGION"),
)

speech_recognizer = AzureSpeechRecognizer(
    speech_config=speech_config,
)

router = APIRouter()
connected_clients = set()

shutdown_initiated = False


@router.on_event("startup")
async def start_event():
    print("startup")


@router.get("/health")
async def health_check():
    return {"type": "status", "value": "ok"}


@router.on_event("shutdown")
async def shutdown_event():
    global shutdown_initiated
    if shutdown_initiated:
        return
    shutdown_initiated = True
    print("[Router] Shutdown initiated")


@router.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        # Load audio into NumPy array
        audio_bytes = await file.read()
        print(len(audio_bytes))

        full_text = speech_recognizer.transcribe(audio_bytes)
        # audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))

        # Transcribe using faster-whisper
        # segments, _info = model.transcribe(audio_data, language="en", beam_size=5)

        # Combine all segments into full text
        # full_text = " ".join([segment.text for segment in segments])
        print("Transcription:", full_text)
        return JSONResponse(content={"transcription": full_text})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")
