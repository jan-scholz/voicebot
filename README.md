![Audiobot Solo](https://talesofindustry.org/images/audiobot_solo.png)

# Interactive Audiobot

This is a bot that can understand spoken queries and responds with speech. The queries are processed with an LLM.

The tech stack consists of a Vite frontend application that can be served via a FastAPI server inside a Docker container. The Docker container can be deployed to Azure App Service. The FastAPI server has various routes that the frontend can communicate with to send and receive audio data and other messages.

## Features

- Speech pause detection & voice synthesis
- Animation to indicate if the bot is listening, detects speech, etc.
- Select a custom profile to personalize the bot's responses
- Edit the prompt live to try out different approaches
- Select from dozens of high-quality voices
- Review conversation conveniently in chat window

![Audiobot Solo](https://talesofindustry.org/images/audiobot_interface.png)


## Installation - venv

Create an initial virtual environment to boostrap with `hatch` and `uv`.

```bash
python3.12 -m venv .venv && \
source .venv/bin/activate && \
pip install hatch uv
```

## Run

> ⚠️ **Attention:** Make sure all environment variables are set or are present in the `.env` file in the root directory.

```
AZURE_OPENAI_API_KEY=XXXXXX
AZURE_OPENAI_ENDPOINT=https://xxxxxx.openai.azure.com/
DEPLOYMENT_ID=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2025-01-01-preview
SPEECH_KEY=XXXXXX
SPEECH_REGION=eastus
```

The static web app assets can be served via a local FastAPI server. First, build the web app into the `src/web/dist` directory, then run the FastAPI server. 

```bash
make clean
make build-web
make run
```

### Docker

We can build a docker image with the web app and FastAPI assets and run it locally at `localhost:8000`.

```bash
make clean
make build-docker
make run-docker-env
```

The `run-docker-env` target expects a `.env` file in the root directory to set the environment variables (e.g. Azure API keys).


### Azure Deployment

The [Deployment Guide](docs/deployment.md) explains how to build the docker image in a dedicated registry and deploy it to Azure App Service.
