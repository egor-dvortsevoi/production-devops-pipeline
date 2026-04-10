import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import PatientPage from "./pages/PatientPage";
import StaffPage from "./pages/StaffPage";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import { clearToken, decodeToken, getCurrentUser, getToken, isTokenUsable, logout, } from "./services/api";
export default function App() {
    const [token, setToken] = useState(() => getToken());
    const [profile, setProfile] = useState(null);
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
            }
            catch {
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
        return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, { onLoggedIn: setToken }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }));
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { children: [_jsx("h1", { children: "Health Portal" }), _jsx("p", { children: profile?.email ?? "Loading profile..." }), _jsxs("p", { children: ["Role: ", effectiveRole ?? "unknown"] }), _jsxs("nav", { children: [_jsx(Link, { to: "/", children: "Home" }), _jsx("br", {}), _jsx(Link, { to: "/patient", children: "Patient" }), _jsx("br", {}), _jsx(Link, { to: "/staff", children: "Staff" }), _jsx("br", {}), _jsx(Link, { to: "/admin", children: "Admin" })] })] }), _jsx("button", { type: "button", onClick: handleLogout, children: "Sign out" })] }), _jsx("main", { className: "content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { isAuthenticated: !!token, children: _jsx(HomePage, { email: profile?.email ?? "unknown", role: effectiveRole ?? "unknown" }) }) }), _jsx(Route, { path: "/patient", element: _jsx(ProtectedRoute, { isAuthenticated: !!token && effectiveRole === "patient", children: _jsx(PatientPage, { token: token }) }) }), _jsx(Route, { path: "/staff", element: _jsx(ProtectedRoute, { isAuthenticated: !!token && effectiveRole === "staff", children: _jsx(StaffPage, {}) }) }), _jsx(Route, { path: "/admin", element: _jsx(ProtectedRoute, { isAuthenticated: !!token && effectiveRole === "admin", children: _jsx(AdminPage, {}) }) }), _jsx(Route, { path: "/login", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) })] }));
}
