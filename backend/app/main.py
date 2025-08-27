from __future__ import annotations

import asyncio
import time
import json
import random
from typing import Any, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from .config import settings
from .gltf_utils import inspect_gltf_metadata
from .agents import PlanRequest, plan_digital_twin, _looks_like_openai_key

# Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Optional OpenTelemetry instrumentation (enabled when OTEL_EXPORTER_OTLP_ENDPOINT is set)
import os
try:  # pragma: no cover - optional runtime instrumentation
    if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.logging import LoggingInstrumentation

        resource = Resource.create({"service.name": "openbrain-backend"})
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter()
        span_processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(span_processor)
        trace.set_tracer_provider(provider)
        LoggingInstrumentation().instrument(set_logging_format=True)
except Exception:  # pragma: no cover - instrumentation failures shouldn't fail app
    # Non-fatal; continue without tracing if misconfigured
    pass

REQUEST_COUNT = Counter(
    "openbrain_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "http_status"],
)
REQUEST_LATENCY = Histogram(
    "openbrain_request_duration_seconds",
    "Latency of HTTP requests in seconds",
    ["method", "endpoint"],
)


app = FastAPI(title="OpenBrain Digital Twin API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def prometheus_middleware(request, call_next):
    endpoint = request.url.path
    method = request.method
    with REQUEST_LATENCY.labels(method=method, endpoint=endpoint).time():
        response = await call_next(request)
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, http_status=response.status_code).inc()
    return response


@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return PlainTextResponse(data.decode("utf-8"), media_type=CONTENT_TYPE_LATEST)


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
            "public_path": "/models/openbrain/brain.gltf",
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


def _make_brain_payload() -> Dict[str, Any]:
    return {
    "ts": time.time(),
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


@app.websocket("/ws/brain")
async def brain_stream(ws: WebSocket) -> None:  # pragma: no cover - covered via integration test
    await ws.accept()
    try:
        while True:
            await ws.send_text(json.dumps(_make_brain_payload()))
            await asyncio.sleep(0.25)
    except WebSocketDisconnect:
        return


@app.post("/agents/plan")
def agent_plan(req: PlanRequest) -> JSONResponse:
    # Validate API key early for predictable error in tests/CI.
    # Use os.environ directly to respect monkeypatched env in tests.
    import os as _os
    if not _looks_like_openai_key(_os.getenv("OPENAI_API_KEY")):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY must be set")
    plan = plan_digital_twin(req.goal)
    return JSONResponse(plan)
