import sys
import json
import time
import asyncio
import typer
import requests
import websockets
from typing import Optional

app = typer.Typer()

API_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/brain"

@app.command()
def plan(goal: str, api_url: str = API_URL):
    """Send a goal to the agent and print the plan."""
    resp = requests.post(f"{api_url}/agents/plan", json={"goal": goal})
    typer.echo(json.dumps(resp.json(), indent=2))

@app.command()
def metrics(api_url: str = API_URL):
    """Fetch and print Prometheus metrics."""
    resp = requests.get(f"{api_url}/metrics")
    typer.echo(resp.text)

@app.command()
def assets(api_url: str = API_URL):
    """List available brain assets."""
    resp = requests.get(f"{api_url}/assets/brain")
    typer.echo(json.dumps(resp.json(), indent=2))

@app.command()
def metadata(api_url: str = API_URL):
    """Show brain GLTF metadata."""
    resp = requests.get(f"{api_url}/assets/brain/metadata")
    typer.echo(json.dumps(resp.json(), indent=2))

@app.command()
def stream_brain(ws_url: str = WS_URL, duration: int = 5):
    """Stream live brain metrics for a given duration (seconds)."""
    async def run():
        async with websockets.connect(ws_url) as ws:
            start = time.time()
            while time.time() - start < duration:
                msg = await ws.recv()
                typer.echo(msg)
    asyncio.run(run())

@app.command()
def llm(prompt: str, backend: str = "llm-ollama", model: str = "gpt-oss:120b", ollama_url: str = "http://127.0.0.1:11434"):
    """Send a prompt to an LLM backend (llm, llm-cmd, llm-ollama, or local Ollama)."""
    if backend == "llm-ollama":
        # Use local Ollama REST API
        resp = requests.post(f"{ollama_url}/api/generate", json={"model": model, "prompt": prompt})
        typer.echo(resp.json().get("response", resp.text))
    elif backend == "llm":
        typer.echo("[llm] Not implemented: requires llm CLI integration.")
    elif backend == "llm-cmd":
        typer.echo("[llm-cmd] Not implemented: requires llm-cmd CLI integration.")
    else:
        typer.echo(f"Unknown backend: {backend}")

if __name__ == "__main__":
    app()
