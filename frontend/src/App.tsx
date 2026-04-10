import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import PatientPage from "./pages/PatientPage";
import StaffPage from "./pages/StaffPage";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import {
  clearToken,
  decodeToken,
  getCurrentUser,
  getToken,
  isTokenUsable,
  logout,
} from "./services/api";

type UserProfile = {
  id: number;
  email: string;
  role: "patient" | "staff" | "admin";
  created_at: string;
};

export default function App() {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function hydrateProfile() {
      if (!token || !isTokenUsable(token)) {
        clearToken();
        setToken(null);
        setProfile(null);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        setProfile(currentUser);
      } catch {
        clearToken();
        setToken(null);
        setProfile(null);
      }
    }

    hydrateProfile();
  }, [token]);

  async function handleLogout() {
    if (token) {
      await logout(token);
    }
    clearToken();
    setToken(null);
    setProfile(null);
    navigate("/login", { replace: true });
  }

  const decodedRole = useMemo(() => {
    if (!token) {
      return null;
    }
    return decodeToken(token)?.role ?? null;
  }, [token]);

  const effectiveRole = profile?.role ?? decodedRole;

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoggedIn={setToken} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>Health Portal</h1>
          <p>{profile?.email ?? "Loading profile..."}</p>
          <p>Role: {effectiveRole ?? "unknown"}</p>
          <nav>
            <Link to="/">Home</Link>
            <br />
            <Link to="/patient">Patient</Link>
            <br />
            <Link to="/staff">Staff</Link>
            <br />
            <Link to="/admin">Admin</Link>
          </nav>
        </div>
        <button type="button" onClick={handleLogout}>
          Sign out
        </button>
      </aside>
      <main className="content">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={!!token}>
                <HomePage email={profile?.email ?? "unknown"} role={effectiveRole ?? "unknown"} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient"
            element={
              <ProtectedRoute isAuthenticated={!!token}>
                <PatientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute isAuthenticated={!!token && effectiveRole === "staff"}>
                <StaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute isAuthenticated={!!token && effectiveRole === "admin"}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
