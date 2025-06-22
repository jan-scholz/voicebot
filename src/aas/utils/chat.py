import os
from collections import deque

from dotenv import load_dotenv
from openai import AzureOpenAI

MAX_MESSAGE_HISTORY = 20


class AzureChatBot:
    def __init__(self, client, model_name, system_prompt=None):
        self.client = client
        self.model_name = model_name
        self.system_prompt = system_prompt
        self.tts_sentence_end = [".", "!", "?"]
        self.message_buffer = deque(maxlen=MAX_MESSAGE_HISTORY)

    def update_system_prompt(self, system_prompt: str):
        self.system_prompt = system_prompt

    def _message_buffer_with_system_prompt(self):
        """Return a copy of the buffer messages prepended with system prompt if set."""
        messages = []
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        messages.extend(list(self.message_buffer))
        return messages

    def chat(self, prompt: str) -> str:
        """Function to ask Azure OpenAI and get a response"""
        messages = self._message_buffer_with_system_prompt()

        user_message = {"role": "user", "content": prompt}
        messages.append(user_message)

        # Send request to Azure OpenAI
        response = self.client.chat.completions.create(
            model=self.model_name,
            max_tokens=200,
            stream=True,
            messages=messages,
        )

        collected_messages = []

        for chunk in response:
            if len(chunk.choices) > 0:
                chunk_message = chunk.choices[0].delta.content
                if chunk_message:
                    collected_messages.append(chunk_message)
                    # if any(
                    #     chunk_message.endswith(punct) for punct in self.tts_sentence_end
                    # ):
                    #     break  # early exit if sentence is complete

        full_response = "".join(collected_messages).strip()

        # Store user and assistant messages in buffer
        self.message_buffer.append(user_message)
        self.message_buffer.append({"role": "assistant", "content": full_response})

        return full_response


def main():
    load_dotenv()

    speech_key = os.environ.get("SPEECH_KEY")
    speech_region = os.environ.get("SPEECH_REGION")

    client = AzureOpenAI(
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
    )

    bot = AzureChatBot(
        client,
        model_name=os.environ.get("DEPLOYMENT_ID"),
        system_prompt="You are helpful",
    )

    # print(bot.chat("How are you?"))


if __name__ == "__main__":
    main()
