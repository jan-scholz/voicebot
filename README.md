# Interactive Audiobot

This is a prototype for a bot that can understand spoken queries and responds with speech. The queries are processed with an LLM.

The tech stack consists of a Vite frontend application that can be served via a FastAPI server inside a Docker container. The Docker container can be deployed to Azure App Service. The FastAPI server has various routes that the frontend can communicate with to send and receive audio data and other messages.


## Installation - venv

Create an initial virtual environment to boostrap with `hatch` and `uv`.

```bash
python3.12 -m venv .venv && \
source .venv/bin/activate && \
pip install hatch uv
```
## Installation - [Devcontainer (VS Code)](https://code.visualstudio.com/docs/devcontainers/containers)

A Dockerfile and .devcontainer directory is available. Ensure Docker Desktop is running and has enough space for building a container.
- In command pallete (`Ctrl+Shift+p`) search for "Dev Containers: Reopen in Devcontainer"
- Open a bash terminal below and follow the steps in the `Run` section

If a devcontainer directory is not available, then create one using the 'Dockerfile' and the method below. 
1. Open the project directory on VS Code
2. In command pallete (`Ctrl+Shift+p`) search for "Dev Containers: Add Dev Container Configuration Files..."
    - Select "Add configurations to workspace"
    - Select "From 'Dockerfile'"
    - Select "Python" and click OK
    - Select "Keep Defaults" and click OK
    - click OK without selecting the option fot the yaml

This should build a devcontainer directory. Once built:
- In command pallete (`Ctrl+Shift+p`) search for "Dev Containers: Reopen in Devcontainer"
- Open a bash terminal below and follow the steps in the `Run` section

## Run

> ⚠️ **Attention:** Make sure all environment variables are set or are present in the `.env` file in the root directory.

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


### Release


```bash
VERSION=0.5.0
hatch version $VERSION
git add -u
git commit -m "bump version to ${VERSION}"
```

Tag the commit on git.

```bash

git tag v${VERSION}
git push origin v${VERSION}
```

Then create a new release on GitHub.


### Development

We can serve the web app outside FastAPI for development purposes.

```bash
make run-web
```
