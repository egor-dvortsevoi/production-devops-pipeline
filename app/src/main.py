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
from models import Appointment, Base, PatientProfile, User, UserRole


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


class PatientProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    date_of_birth: str
    phone: str
    preferred_timezone: str


class PatientProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    date_of_birth: str | None = Field(default=None, min_length=10, max_length=10)
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    preferred_timezone: str | None = Field(default=None, min_length=2, max_length=64)


class AppointmentCreateRequest(BaseModel):
    scheduled_at: datetime
    reason: str = Field(min_length=3, max_length=255)


class AppointmentResponse(BaseModel):
    id: int
    scheduled_at: str
    reason: str
    status: str


def _serialize_profile(profile: PatientProfile) -> PatientProfileResponse:
    return PatientProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        date_of_birth=profile.date_of_birth,
        phone=profile.phone,
        preferred_timezone=profile.preferred_timezone,
    )


def _serialize_appointment(appointment: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=appointment.id,
        scheduled_at=appointment.scheduled_at.isoformat(),
        reason=appointment.reason,
        status=appointment.status,
    )


def get_or_create_patient_profile(db: Session, user: User) -> PatientProfile:
    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    ).scalar_one_or_none()

    if profile is None:
        profile = PatientProfile(
            user_id=user.id,
            full_name=user.email.split("@")[0].replace(".", " ").title(),
            date_of_birth="",
            phone="",
            preferred_timezone="UTC",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


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

        demo_user = db.execute(select(User).where(User.email == "demo@example.com")).scalar_one()
        profile = get_or_create_patient_profile(db, demo_user)

        existing_appointments = db.execute(
            select(Appointment).where(Appointment.patient_id == demo_user.id)
        ).scalars().all()

        if not existing_appointments:
            now = datetime.now(timezone.utc)
            db.add_all(
                [
                    Appointment(
                        patient_id=demo_user.id,
                        scheduled_at=now.replace(hour=14, minute=0, second=0, microsecond=0),
                        reason="Initial wellness check",
                        status="scheduled",
                    ),
                    Appointment(
                        patient_id=demo_user.id,
                        scheduled_at=now.replace(hour=16, minute=30, second=0, microsecond=0),
                        reason="Medication follow-up",
                        status="scheduled",
                    ),
                ]
            )

        if profile.full_name.strip() == "":
            profile.full_name = "Demo Patient"

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


def require_patient(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )
    return user


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


@app.get("/patients/me/profile")
def get_patient_profile(
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
) -> PatientProfileResponse:
    profile = get_or_create_patient_profile(db, user)
    return _serialize_profile(profile)


@app.put("/patients/me/profile")
def update_patient_profile(
    payload: PatientProfileUpdateRequest,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
) -> PatientProfileResponse:
    profile = get_or_create_patient_profile(db, user)
    updates = payload.model_dump(exclude_none=True, exclude_unset=True)

    for key, value in updates.items():
        if isinstance(value, str):
            setattr(profile, key, value.strip())
        else:
            setattr(profile, key, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _serialize_profile(profile)


@app.get("/patients/me/appointments")
def list_patient_appointments(
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
) -> dict[str, list[AppointmentResponse]]:
    appointments = db.execute(
        select(Appointment)
        .where(Appointment.patient_id == user.id)
        .order_by(Appointment.scheduled_at.asc())
    ).scalars().all()

    return {
        "items": [_serialize_appointment(item) for item in appointments],
    }


@app.post("/patients/me/appointments", status_code=status.HTTP_201_CREATED)
def create_patient_appointment(
    payload: AppointmentCreateRequest,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
) -> AppointmentResponse:
    scheduled_at = payload.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

    appointment = Appointment(
        patient_id=user.id,
        scheduled_at=scheduled_at,
        reason=payload.reason.strip(),
        status="scheduled",
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return _serialize_appointment(appointment)


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
