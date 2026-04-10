import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, saveToken, decodeToken } from "../services/api";
export default function LoginPage({ onLoggedIn }) {
    const [email, setEmail] = useState("demo@example.com");
    const [password, setPassword] = useState("password123");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const result = await login({ email, password });
            saveToken(result.access_token);
            onLoggedIn(result.access_token);
            const payload = decodeToken(result.access_token);
            if (payload?.role === "staff") {
                navigate("/staff", { replace: true });
            }
            else if (payload?.role === "admin") {
                navigate("/admin", { replace: true });
            }
            else {
                navigate("/patient", { replace: true });
            }
        }
        catch {
            setError("Invalid email or password");
        }
        finally {
            setIsLoading(false);
        }
    }
    return (_jsx("main", { className: "auth-shell", children: _jsxs("section", { className: "auth-card", children: [_jsx("h1", { children: "Health Portal" }), _jsx("p", { children: "Sign in to continue." }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Email", _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true })] }), error && _jsx("p", { className: "error-text", children: error }), _jsx("button", { type: "submit", disabled: isLoading, children: isLoading ? "Signing in..." : "Sign in" })] })] }) }));
}
