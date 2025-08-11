from __future__ import annotations

import asyncio
import json
import random
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .gltf_utils import inspect_gltf_metadata
from .agents import PlanRequest, plan_digital_twin


app = FastAPI(title="OpenBrain Digital Twin API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/assets/brain")
def list_brain_assets() -> Dict[str, Any]:
    public_gltf = settings.public_brain_gltf()
    source_dir = settings.source_brain_gltf_dir()

    assets = []
    if public_gltf.exists():
        assets.append({
            "name": "Human Brain (GLTF)",
            "public_path": "/models/human_brain/Human_Brain.gltf",
            "absolute_path": str(public_gltf),
        })

    if source_dir.exists():
        src = source_dir / "Human_Brain.gltf"
        if src.exists():
            assets.append({
                "name": "Human Brain (GLTF, source)",
                "absolute_path": str(src),
            })

    return {"assets": assets}


@app.get("/assets/brain/metadata")
def brain_metadata() -> Dict[str, Any]:
    return inspect_gltf_metadata(settings.public_brain_gltf())


@app.websocket("/ws/brain")
async def brain_stream(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            # Simulated neural activation stream
            payload = {
                "ts": asyncio.get_event_loop().time(),
                "metrics": {
                    "activation_mean": random.random(),
                    "activation_std": random.random() * 0.1,
                    "regions": {
                        "Frontal": random.random(),
                        "Parietal": random.random(),
                        "Temporal": random.random(),
                        "Occipital": random.random(),
                    },
                },
            }
            await ws.send_text(json.dumps(payload))
            await asyncio.sleep(0.25)
    except WebSocketDisconnect:
        return


@app.post("/agents/plan")
def agent_plan(req: PlanRequest) -> JSONResponse:
    plan = plan_digital_twin(req.goal)
    return JSONResponse(plan)


