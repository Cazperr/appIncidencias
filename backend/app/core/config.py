from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite:///./incidencias.db"
    TURSO_AUTH_TOKEN: str = ""

    # Alternativas para Railway
    TURSO_MASTER_URL: str = ""
    TURSO_MASTER_TOKEN: str = ""

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def master_db_url(self) -> str:
        return self.TURSO_MASTER_URL or self.DATABASE_URL

    @property
    def master_db_token(self) -> str:
        return self.TURSO_MASTER_TOKEN or self.TURSO_AUTH_TOKEN

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()