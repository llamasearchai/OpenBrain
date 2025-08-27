from __future__ import annotations

from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from fastapi import HTTPException
import os
import json
import uuid
from datetime import datetime
from enum import Enum

from openai import OpenAI
from anthropic import Anthropic
from cohere import Client as CohereClient

from .config import Settings, settings
from .models import AgentSession, AgentMemory

# Provider enum for LLM selection
class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    OLLAMA = "ollama"

# Enhanced request models
class PlanRequest(BaseModel):
    goal: str
    provider: Provider = Provider.OPENAI
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 1000

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    provider: Provider = Provider.OPENAI
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 1000
    session_id: Optional[str] = None

class MemoryEntry(BaseModel):
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Provider configuration
PROVIDER_CONFIG = {
    Provider.OPENAI: {
        "default_model": "gpt-4",
        "models": ["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
    },
    Provider.ANTHROPIC: {
        "default_model": "claude-3-opus-20240229",
        "models": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
    },
    Provider.COHERE: {
        "default_model": "command-r-plus",
        "models": ["command-r-plus", "command-r", "command", "command-light"]
    },
    Provider.OLLAMA: {
        "default_model": "llama3",
        "models": ["llama3", "mistral", "neural-chat", "starling-lm"]
    }
}

def _looks_like_openai_key(value: str | None) -> bool:
    if not value:
        return False
    # Basic heuristic to avoid leaking calls in tests/CI
    return value.startswith("sk-") and len(value) > 20

class AgentManager:
    def __init__(self):
        self.providers = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize all available LLM providers"""
        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            self.providers[Provider.OPENAI] = OpenAI(
                api_key=openai_key,
                base_url=os.getenv("OPENAI_BASE_URL", "http://127.0.0.1:4000")
            )
        
        # Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            self.providers[Provider.ANTHROPIC] = Anthropic(api_key=anthropic_key)
        
        # Cohere
        cohere_key = os.getenv("COHERE_API_KEY")
        if cohere_key:
            self.providers[Provider.COHERE] = CohereClient(cohere_key)
        
        # Ollama (local)
        self.providers[Provider.OLLAMA] = OpenAI(
            base_url="http://localhost:11434/v1",
            api_key="ollama"  # Ollama doesn't require a real API key
        )
    
    def get_provider(self, provider: Provider):
        """Get initialized provider client"""
        # Lazily (re)initialize providers to pick up env changes during tests/dev
        if provider not in self.providers:
            self._initialize_providers()
        if provider not in self.providers:
            raise HTTPException(
                status_code=400,
                detail=f"Provider {provider} not configured or not available"
            )
        return self.providers[provider]
    
    def plan_digital_twin(self, request: PlanRequest) -> Dict[str, Any]:
        """Create a concrete plan using the specified LLM provider"""
        provider = self.get_provider(request.provider)
        model = request.model or PROVIDER_CONFIG[request.provider]["default_model"]
        
        system_prompt = (
            "You are a senior full-stack engineer building a digital twin of a human brain. "
            "Provide a concrete, step-by-step, testable plan to render the model in Three.js, "
            "integrate Rapier physics, stream metrics from a FastAPI backend, and define tests, "
            "Dockerfiles, and CI. Avoid revealing internal chain-of-thought; return only the final plan."
        )
        
        user_prompt = f"Goal: {request.goal}\nReturn a JSON with keys: architecture, steps, tests, risks, deliverables."
        
        try:
            if request.provider == Provider.OPENAI:
                completion = provider.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    response_format={"type": "json_object"},
                )
                content = completion.choices[0].message.content or "{}"
                return json.loads(content)
            
            elif request.provider == Provider.ANTHROPIC:
                completion = provider.messages.create(
                    model=model,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                content = completion.content[0].text
                return json.loads(content)
            
            elif request.provider == Provider.COHERE:
                response = provider.chat(
                    model=model,
                    message=user_prompt,
                    temperature=request.temperature,
                    preamble=system_prompt
                )
                return json.loads(response.text)
            
            elif request.provider == Provider.OLLAMA:
                completion = provider.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    response_format={"type": "json_object"},
                )
                content = completion.choices[0].message.content or "{}"
                return json.loads(content)
        
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse LLM response as JSON"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"LLM provider error: {str(e)}"
            )
    
    def chat(self, request: ChatRequest) -> Dict[str, Any]:
        """Have a conversation with the specified LLM provider"""
        provider = self.get_provider(request.provider)
        model = request.model or PROVIDER_CONFIG[request.provider]["default_model"]
        
        try:
            if request.provider == Provider.OPENAI:
                completion = provider.chat.completions.create(
                    model=model,
                    messages=request.messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                return {
                    "content": completion.choices[0].message.content,
                    "role": "assistant"
                }
            
            elif request.provider == Provider.ANTHROPIC:
                # Convert messages to Anthropic format
                anthropic_messages = []
                system_message = None
                
                for msg in request.messages:
                    if msg["role"] == "system":
                        system_message = msg["content"]
                    else:
                        anthropic_messages.append({
                            "role": msg["role"],
                            "content": msg["content"]
                        })
                
                completion = provider.messages.create(
                    model=model,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                    system=system_message,
                    messages=anthropic_messages
                )
                return {
                    "content": completion.content[0].text,
                    "role": "assistant"
                }
            
            elif request.provider == Provider.COHERE:
                # Get the last user message as the prompt
                last_message = next((msg for msg in reversed(request.messages) if msg["role"] == "user"), None)
                if not last_message:
                    raise HTTPException(status_code=400, detail="No user message found")
                
                response = provider.chat(
                    model=model,
                    message=last_message["content"],
                    temperature=request.temperature,
                )
                return {
                    "content": response.text,
                    "role": "assistant"
                }
            
            elif request.provider == Provider.OLLAMA:
                completion = provider.chat.completions.create(
                    model=model,
                    messages=request.messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                return {
                    "content": completion.choices[0].message.content,
                    "role": "assistant"
                }
        
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"LLM provider error: {str(e)}"
            )
    
    def add_memory(self, session_id: str, entry: MemoryEntry) -> str:
        """Add a memory entry to the agent's memory"""
        memory_id = str(uuid.uuid4())
        
        # In a real implementation, this would store in a database
        # For now, we'll just return the ID
        return memory_id
    
    def get_memory(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve memory entries for a session"""
        # In a real implementation, this would retrieve from a database
        # For now, we'll return an empty list
        return []

# Global agent manager instance
agent_manager = AgentManager()

# Legacy function for backward compatibility
def plan_digital_twin(goal: str) -> Dict[str, Any]:
    """Legacy function for backward compatibility"""
    request = PlanRequest(goal=goal)
    return agent_manager.plan_digital_twin(request)
