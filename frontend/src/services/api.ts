import { jwtDecode } from "jwt-decode";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const ACCESS_TOKEN_KEY = "health_portal_access_token";

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type CurrentUser = {
  id: number;
  email: string;
  role: "patient" | "staff" | "admin";
  created_at: string;
};

export type PatientProfile = {
  user_id: number;
  full_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  preferred_timezone: string | null;
  insurance_provider: string | null;
  emergency_contact: string | null;
  allergies: string | null;
  notes: string | null;
  updated_at: string;
};

export type PatientProfileUpdateRequest = {
  full_name?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  preferred_timezone?: string | null;
  insurance_provider?: string | null;
  emergency_contact?: string | null;
  allergies?: string | null;
  notes?: string | null;
};

export type Appointment = {
  id: number;
  scheduled_at: string;
  reason: string;
  status: string;
  created_at: string;
};

type AppointmentListResponse = {
  items: Appointment[];
};

export type AppointmentCreateRequest = {
  scheduled_at: string;
  reason: string;
};

type JwtPayload = {
  sub: string;
  role: "patient" | "staff" | "admin";
  exp: number;
  iat: number;
};

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenUsable(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
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

  return (await response.json()) as LoginResponse;
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Unable to fetch user profile");
  }

  return (await response.json()) as CurrentUser;
}

export async function getPatientProfile(token: string): Promise<PatientProfile> {
  const response = await fetch(`${API_BASE_URL}/patients/me/profile`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Unable to fetch patient profile");
  }

  return (await response.json()) as PatientProfile;
}

export async function updatePatientProfile(
  token: string,
  payload: PatientProfileUpdateRequest,
): Promise<PatientProfile> {
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

  return (await response.json()) as PatientProfile;
}

export async function getPatientAppointments(token: string): Promise<AppointmentListResponse> {
  const response = await fetch(`${API_BASE_URL}/patients/me/appointments`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Unable to fetch appointments");
  }

  return (await response.json()) as AppointmentListResponse;
}

export async function createPatientAppointment(
  token: string,
  payload: AppointmentCreateRequest,
): Promise<Appointment> {
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

  return (await response.json()) as Appointment;
}
