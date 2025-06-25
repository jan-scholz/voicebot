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
from openai import AzureOpenAI

from aas.models import ChatMessage, Prompt, SpeechConfigMessage
from aas.utils.chat import AzureChatBot
from aas.utils.profile_manager import ProfileManager
from aas.utils.speech_recognizer import AzureSpeechRecognizer
from aas.utils.speech_synthesizer import AzureSpeechSynthesizer

load_dotenv()

profile_manager = ProfileManager()
profile_manager.load_profiles("user_profile.json")

client = AzureOpenAI(
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
)
bot = AzureChatBot(client, model_name=os.environ.get("DEPLOYMENT_ID"))

speech_config = speechsdk.SpeechConfig(
    subscription=os.environ.get("SPEECH_KEY"),
    region=os.environ.get("SPEECH_REGION"),
)
speech_recognizer = AzureSpeechRecognizer(
    speech_config=speech_config,
)

synthesizer = AzureSpeechSynthesizer(speech_config)


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


@router.post("/chat", response_model=ChatMessage)
async def chat(chat_message: ChatMessage):
    try:
        response = bot.chat(chat_message.content)
        return ChatMessage(role="assistant", content=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text2speech")
async def chat(chat_message: ChatMessage):
    try:
        print(f"/text2speech {chat_message=}")
        # synthesizer.set_voice("en-US-GuyNeural")
        audio_stream = synthesizer.text_to_audio_stream(chat_message.content)
        return StreamingResponse(audio_stream, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speechconfig")
async def chat(config: SpeechConfigMessage):
    try:
        print(f"/speechconfig{config=}")
        synthesizer.set_voice(config.voice_name)
        return JSONResponse(status_code=201, content={"message": "Speech config saved"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile_names")
async def profile_names():
    return profile_manager.list_profile_ids_and_names()


@router.get("/prompts/{profile_id}")
async def get_prompt(profile_id: str):
    prompt_text = profile_manager.get_prompt_by_id(profile_id)
    if prompt_text is None:
        raise HTTPException(status_code=404, detail="No prompt found")
    prompt = Prompt(profile_id=profile_id, text=prompt_text)
    return prompt


@router.post("/prompts/")
async def update_prompt(prompt: Prompt):
    try:
        profile_manager.update_prompt_cache(prompt.profile_id, prompt.text)
        bot.update_system_prompt(prompt.text)
        # print(f"updated {prompt.profile_id} with {prompt.text}")
        return JSONResponse(status_code=201, content={"message": "Prompt saved"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
