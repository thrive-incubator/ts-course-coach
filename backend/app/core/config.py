"""Application settings using Pydantic Settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env file."""

    # Application
    debug: bool = True
    cors_origins: str = "http://localhost:5173"
    frontend_base_url: str = "http://localhost:5173"

    # Firebase
    firebase_project_id: str = ""

    # Authentication
    jwt_secret_key: str = "change-me-in-production"

    # Gemini
    gemini_api_key: str = ""
    gemini_model_pro: str = "gemini-3-pro-preview"
    gemini_model_flash: str = "gemini-3.7-flash"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings singleton."""
    return Settings()
