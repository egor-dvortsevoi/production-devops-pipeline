import os


class Settings:
    def __init__(self) -> None:
        self.app_name = os.getenv("APP_NAME", "health-portal-api")
        self.app_env = os.getenv("APP_ENV", "local")
        self.app_jwt_secret = os.getenv("APP_JWT_SECRET", "change-me")

        self.postgres_host = os.getenv("POSTGRES_HOST", "db")
        self.postgres_port = int(os.getenv("POSTGRES_PORT", "5432"))
        self.postgres_db = os.getenv("POSTGRES_DB", "health_portal")
        self.postgres_user = os.getenv("POSTGRES_USER", "postgres")
        self.postgres_password = os.getenv("POSTGRES_PASSWORD", "postgres")

        default_database_url = (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        self.database_url = os.getenv("DATABASE_URL", default_database_url)


settings = Settings()
