from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class Prompt(BaseModel):
    profile_id: str
    text: str


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TranscriptionMessage(BaseModel):
    transcription: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    contains_wakephrase: Optional[bool] = False


class SpeechConfigMessage(BaseModel):
    voice_name: str
    style: Optional[str] = "general"  # Default style used by most voices
    rate: Optional[str] = "0%"  # "0%" means normal speed
    pitch: Optional[str] = "0Hz"  # "0Hz" means no pitch adjustment
    role: Optional[str] = None  # Role only supported by some voices
