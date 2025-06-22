import os
import wave
from io import BytesIO

import azure.cognitiveservices.speech as speechsdk
import pyaudio
from dotenv import load_dotenv

LOCALES = [
    "en-US",  # United States
    "en-GB",  # United Kingdom
    "en-CA",  # Canada
    "fr-CA",  # French (Canada)
]

GENDERS = [
    "female",
    "male",
]


class AzureSpeechSynthesizer:
    def __init__(self, speech_config):
        self.speech_config = speech_config
        self.voice_name = None
        self._update_synthesizer()

    def _update_synthesizer(self):
        """(Re)create the SpeechSynthesizer with the current config."""
        self.speech_synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=self.speech_config,
            audio_config=None,  # we could output audio to a custom stream here
        )

    def set_voice(self, voice_name):
        """Set the voice to be used for synthesis."""
        self.voice_name = voice_name
        self.speech_config.speech_synthesis_voice_name = voice_name
        self._update_synthesizer()

    def text_to_audio_stream(self, text):
        """Synthesize text and return audio as a BytesIO stream."""

        print(f"text_to_audio_stream {text=}")
        result = self.speech_synthesizer.speak_text_async(text).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print(f"audio_data to bytes audio_stream")
            audio_stream = BytesIO(result.audio_data)
            audio_stream.seek(0)
            return audio_stream
        else:
            raise Exception(f"Speech synthesis failed: {result.reason}")

    def list_voices(self, gender: str = None, locale: str = None):
        """Fetch and return a list of available voice names from Azure."""
        if gender is None:
            genders = GENDERS
        else:
            genders = [gender]

        if locale is None:
            locales = LOCALES
        else:
            locales = [locale]

        result = self.speech_synthesizer.get_voices_async().get()

        if not result.reason == speechsdk.ResultReason.VoicesListRetrieved:
            raise Exception(f"Failed to retrieve voices: {result.reason}")

        short_names = []
        for voice in result.voices:
            if voice.locale in locales and voice.gender.name.lower() in genders:
                short_names.append(voice.short_name)

        return short_names

    def list_genders(self):
        return GENDERS

    def list_locales(self):
        return LOCALES


def test_play_audio_stream(audio_stream):
    # Make sure we're at the beginning of the stream
    audio_stream.seek(0)

    # Use wave module to parse the WAV data
    with wave.open(audio_stream, "rb") as wf:
        p = pyaudio.PyAudio()

        stream = p.open(
            format=p.get_format_from_width(wf.getsampwidth()),
            channels=wf.getnchannels(),
            rate=wf.getframerate(),
            output=True,
        )

        chunk = 1024
        data = wf.readframes(chunk)

        while data:
            stream.write(data)
            data = wf.readframes(chunk)

        stream.stop_stream()
        stream.close()
        p.terminate()


def main():
    load_dotenv()

    speech_config = speechsdk.SpeechConfig(
        subscription=os.environ.get("SPEECH_KEY"),
        region=os.environ.get("SPEECH_REGION"),
    )
    # speech_config.speech_synthesis_voice_name = "en-US-JennyMultilingualNeural"

    synthesizer = AzureSpeechSynthesizer(speech_config)
    synthesizer.set_voice("en-US-GuyNeural")
    audio_stream = synthesizer.text_to_audio_stream("Hello!")

    test_play_audio_stream(audio_stream)

    voices = synthesizer.list_voices(gender="female", locale="en-GB")

    print(synthesizer.list_genders())
    print(synthesizer.list_locales())


if __name__ == "__main__":
    main()
