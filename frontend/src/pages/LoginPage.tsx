import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { login, saveToken, decodeToken } from "../services/api";

type Props = {
  onLoggedIn: (token: string) => void;
};

export default function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
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
      } else if (payload?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/patient", { replace: true });
      }
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Health Portal</h1>
        <p>Sign in to continue.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
