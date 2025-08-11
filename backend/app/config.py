from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini")

    cors_origins: list[str] = Field(default_factory=lambda: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ])

    def repo_root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def public_brain_gltf(self) -> Path:
        return self.repo_root() / "web/public/models/human_brain/Human_Brain.gltf"

    def source_brain_gltf_dir(self) -> Path:
        return self.repo_root() / "detailed-human-brain-model-2025-05-03-05-00-45-utc/[GLTF] Human_Brain"


settings = Settings()  # Singleton-style simple access


