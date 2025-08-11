from __future__ import annotations

from typing import Dict, Any
from pydantic import BaseModel
from fastapi import HTTPException
import os

from openai import OpenAI
from .config import Settings


class PlanRequest(BaseModel):
    goal: str


def _looks_like_openai_key(value: str | None) -> bool:
    if not value:
        return False
    # Basic heuristic to avoid leaking calls in tests/CI
    return value.startswith("sk-") and len(value) > 20


def plan_digital_twin(goal: str) -> Dict[str, Any]:
    # Re-evaluate settings at call time to honor monkeypatched env in tests
    cfg = Settings()
    api_key = cfg.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not _looks_like_openai_key(api_key):
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured or invalid format")

    client = OpenAI(api_key=api_key)

    system = (
        "You are a senior full-stack engineer building a digital twin of a human brain."
        " Provide a concrete, step-by-step, testable plan to render the model in Three.js,"
        " integrate Rapier physics, stream metrics from a FastAPI backend, and define tests,"
        " Dockerfiles, and CI. Avoid revealing internal chain-of-thought; return only the final plan."
    )

    user = f"Goal: {goal}\nReturn a JSON with keys: architecture, steps, tests, risks, deliverables."

    completion = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    content = completion.choices[0].message.content or "{}"
    # The SDK returns JSON string when response_format is json_object
    import json

    return json.loads(content)


