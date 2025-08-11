from __future__ import annotations

from typing import Dict, Any
from pydantic import BaseModel
from fastapi import HTTPException

from openai import OpenAI
from .config import settings


class PlanRequest(BaseModel):
    goal: str


def plan_digital_twin(goal: str) -> Dict[str, Any]:
    if not settings.openai_api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")

    client = OpenAI(api_key=settings.openai_api_key)

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


