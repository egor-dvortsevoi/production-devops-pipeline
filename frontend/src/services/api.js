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
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
export async function getCurrentUser(token) {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Unable to fetch user profile");
    }
    return (await response.json());
}
