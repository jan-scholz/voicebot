# Interactive Audiobot

This is a prototype for a bot that can understand spoken queries and responds with speech. The queries are processed with an LLM.

The tech stack consists of a Vite frontend application that can be served via a FastAPI server inside a Docker container. The Docker container can be deployed to Azure App Service. The FastAPI server has various routes that the frontend can communicate with to send and receive audio data and other messages.


## Installation

Create an initial virtual environment to boostrap with `hatch` and `uv`.

```bash
python3.12 -m venv .venv && \
source .venv/bin/activate && \
pip install hatch uv
```


## Run

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
make run-docker
```

### Development

We can serve the web app outside FastAPI for development purposes.

```bash
make run-web
```
