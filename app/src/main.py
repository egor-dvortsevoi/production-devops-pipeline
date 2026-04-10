from datetime import datetime, timezone
import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import create_access_token, decode_access_token, hash_password, verify_password
from config import settings
from database import SessionLocal, engine, get_db, run_db_check
from models import Base, User, UserRole


app = FastAPI(title=settings.app_name)
security = HTTPBearer(auto_error=False)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://localhost:8080",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)


def seed_default_users() -> None:
    seed_data = [
        ("demo@example.com", UserRole.patient),
        ("staff@example.com", UserRole.staff),
        ("admin@example.com", UserRole.admin),
    ]

    with SessionLocal() as db:
        for email, role in seed_data:
            existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
            if existing is not None:
                continue

            db.add(
                User(
                    email=email,
                    password_hash=hash_password("password123"),
                    role=role,
                )
            )

        db.commit()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_token",
        )

    payload = decode_access_token(credentials.credentials)
    subject = payload.get("sub")

    if not isinstance(subject, str) or not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )

    user = db.execute(select(User).where(User.email == subject)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user_not_found",
        )

    return user


def require_role(role: UserRole):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden",
            )
        return user

    return role_checker


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    seed_default_users()


@app.get("/")
def get_current_time() -> dict[str, str]:
    return {
        "message": "Health portal API is running",
        "current_time_utc": datetime.now(timezone.utc).isoformat(),
        "environment": settings.app_env,
    }


@app.get("/health")
def health() -> dict[str, str]:
    try:
        run_db_check()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database_unavailable",
        ) from exc

    return {
        "status": "ok",
        "database": "up",
    }


@app.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    if settings.app_jwt_secret in {"", "change-me"}:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="APP_JWT_SECRET is not configured",
        )

    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )

    token = create_access_token(subject=user.email, role=user.role.value)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@app.post("/auth/logout")
def logout(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {
        "status": "logged_out",
    }


@app.get("/users/me")
def users_me(user: User = Depends(get_current_user)) -> dict[str, str | int]:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


@app.get("/staff/schedules")
def staff_schedules(_: User = Depends(require_role(UserRole.staff))) -> dict[str, list[dict[str, str]]]:
    return {
        "items": [
            {
                "schedule_id": "stub-001",
                "status": "placeholder",
            }
        ]
    }
