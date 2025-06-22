from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles

from aas.router import router

app = FastAPI()

# Add WebSocket route
app.include_router(router)

# Mount static frontend
frontend_dist = Path(__file__).resolve().parent.parent / "web" / "dist"
app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
