from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./pcdc.db"   # swap to postgresql://... in prod
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALG: str = "HS256"
    ACCESS_MINUTES: int = 720
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    APP_URL: str = "http://localhost:3000"      # frontend base, used in invitation links

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
