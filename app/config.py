"""Application configuration"""
import json
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "product_price_db"
    postgres_user: str = "postgres"
    postgres_password: str = ""
    
    # OpenAI
    openai_model: str = "gpt-4o-mini"
    openai_temperature: float = 0.1
    openai_api_key: Optional[str] = None
    
    # Application
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Load OpenAI API key from secret.json if exists
        secret_path = Path("secret.json")
        if secret_path.exists():
            try:
                with open(secret_path, "r", encoding="utf-8") as f:
                    secrets = json.load(f)
                    self.openai_api_key = secrets.get("openai_api_key") or self.openai_api_key
            except Exception as e:
                print(f"Warning: Could not load secret.json: {e}")


settings = Settings()


