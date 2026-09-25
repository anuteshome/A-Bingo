from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "A Bingo Bot"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bingo_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Telegram Auth & Mini App
    BOT_TOKEN: str = "8990850541:AAGFCIi6qLtQydYp7q4DyHZHqnO-3VrF3pg"
    WEB_APP_URL: str = "https://adjustments-benefits-contract-concert.trycloudflare.com"
    
    # Security JWT
    SECRET_KEY: str = "dev_super_secret_jwt_hmac_key_bingo_telegram_2026_9999"
    ADMIN_SECRET: str = "admin123"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
