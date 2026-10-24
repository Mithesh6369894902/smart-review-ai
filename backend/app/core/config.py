from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models" / "saved"

class Settings(BaseSettings):
    APP_NAME: str = "SmartReviewAI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list = ["*"]
    MODEL_DIR: str = str(MODELS_DIR)

    class Config:
        env_file = ".env"

settings = Settings()
