import os
import pathlib
import sys
import importlib

from fastapi.testclient import TestClient

SRC_DIR = pathlib.Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC_DIR))

# Use sqlite for CI/local tests so tests do not depend on a running Postgres container.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./app/tests/test.db")
os.environ.setdefault("APP_JWT_SECRET", "test-jwt-secret")

main_module = importlib.import_module("main")
main_module.startup()


client = TestClient(main_module.app)


def login(email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()


def test_root_returns_time_payload() -> None:
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Health portal API is running"
    assert "current_time_utc" in body
    assert body["environment"]


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "up"}


def test_auth_login_returns_bearer_token() -> None:
    body = login("demo@example.com", "password123")
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_auth_login_rejects_invalid_password() -> None:
    response = client.post(
        "/auth/login",
        json={"email": "demo@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_credentials"


def test_auth_login_requires_configured_secret(monkeypatch) -> None:
    monkeypatch.setattr(main_module.settings, "app_jwt_secret", "change-me")

    response = client.post(
        "/auth/login",
        json={"email": "demo@example.com", "password": "password123"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "APP_JWT_SECRET is not configured"


def test_users_me_requires_token() -> None:
    response = client.get("/users/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "missing_token"


def test_users_me_returns_authenticated_user() -> None:
    body = login("demo@example.com", "password123")
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )

    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == "demo@example.com"
    assert profile["role"] == "patient"


def test_staff_route_forbidden_for_patient() -> None:
    body = login("demo@example.com", "password123")
    response = client.get(
        "/staff/schedules",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "forbidden"


def test_staff_route_allowed_for_staff() -> None:
    body = login("staff@example.com", "password123")
    response = client.get(
        "/staff/schedules",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["items"]


def test_logout_requires_token() -> None:
    response = client.post("/auth/logout")

    assert response.status_code == 401
    assert response.json()["detail"] == "missing_token"


def test_logout_succeeds_with_token() -> None:
    body = login("demo@example.com", "password123")
    response = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "logged_out"
