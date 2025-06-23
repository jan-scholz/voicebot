from azure.cognitiveservices.speech import SpeechConfig, SpeechRecognizer
from azure.cognitiveservices.speech.audio import (
    AudioConfig,
    AudioStreamFormat,
    PushAudioInputStream,
)


class AzureSpeechRecognizer:
    def __init__(self, speech_config):
        self.speech_config = speech_config
        self.stream_format = AudioStreamFormat(
            samples_per_second=16000, bits_per_sample=16, channels=1
        )

    def transcribe(self, audio_bytes: bytes) -> str:
        """Transcribes a single audio buffer."""
        push_stream = PushAudioInputStream(self.stream_format)
        audio_config = AudioConfig(stream=push_stream)
        recognizer = SpeechRecognizer(
            speech_config=self.speech_config, audio_config=audio_config
        )

        push_stream.write(audio_bytes)
        push_stream.close()
        result = recognizer.recognize_once_async().get()
        return result.text


def main():
    import os

    import sounddevice as sd
    from dotenv import load_dotenv

    def record_audio_chunk(duration=2.0, sample_rate=16000):
        """Record audio from microphone and return it as 16-bit PCM bytes."""
        print("Recording...")
        audio = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype="int16",
        )
        sd.wait()  # Wait until recording is finished
        print("Recording done.")
        return audio.tobytes()

    load_dotenv()

    speech_config = SpeechConfig(
        subscription=os.environ.get("SPEECH_KEY"),
        region=os.environ.get("SPEECH_REGION"),
    )
    speech_recognizer = AzureSpeechRecognizer(speech_config=speech_config)

    audio = record_audio_chunk()
    result = speech_recognizer.transcribe(audio)
    print(result)


if __name__ == "__main__":
    main()
