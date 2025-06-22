import asyncio
import json
import os
import queue
import uuid

import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from openai import AzureOpenAI

from aas.models import ChatMessage, Prompt, SpeechConfigMessage
from aas.utils.chat import AzureChatBot
from aas.utils.profile_manager import ProfileManager
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


# WebSocket endpoint for audio streaming
@router.websocket("/ws/audio")
async def websocket_audio(websocket: WebSocket):
    await websocket.accept()
    print("[ROUTER] Audio WebSocket connected.")
    try:
        data = await websocket.receive_bytes()
    except WebSocketDisconnect:
        print("[ROUTER] Audio WebSocket disconnected.")


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
