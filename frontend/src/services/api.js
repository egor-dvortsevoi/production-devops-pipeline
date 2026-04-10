import { jwtDecode } from "jwt-decode";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const ACCESS_TOKEN_KEY = "health_portal_access_token";
export function getToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function saveToken(token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}
export function clearToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
}
export function decodeToken(token) {
    try {
        return jwtDecode(token);
    }
    catch {
        return null;
    }
}
export function isTokenUsable(token) {
    const payload = decodeToken(token);
    if (!payload) {
        return false;
    }
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
}
function authHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
    };
}
export async function login(request) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error("Login failed");
    }
    return (await response.json());
}
export async function logout(token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: authHeaders(token),
    });
}
export async function getCurrentUser(token) {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: authHeaders(token),
    });
    if (!response.ok) {
        throw new Error("Unable to fetch user profile");
    }
    return (await response.json());
}
export async function getPatientProfile(token) {
    const response = await fetch(`${API_BASE_URL}/patients/me/profile`, {
        headers: authHeaders(token),
    });
    if (!response.ok) {
        throw new Error("Unable to fetch patient profile");
    }
    return (await response.json());
}
export async function updatePatientProfile(token, payload) {
    const response = await fetch(`${API_BASE_URL}/patients/me/profile`, {
        method: "PUT",
        headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error("Unable to update patient profile");
    }
    return (await response.json());
}
export async function getPatientAppointments(token) {
    const response = await fetch(`${API_BASE_URL}/patients/me/appointments`, {
        headers: authHeaders(token),
    });
    if (!response.ok) {
        throw new Error("Unable to fetch appointments");
    }
    return (await response.json());
}
export async function createPatientAppointment(token, payload) {
    const response = await fetch(`${API_BASE_URL}/patients/me/appointments`, {
        method: "POST",
        headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error("Unable to create appointment");
    }
    return (await response.json());
}
