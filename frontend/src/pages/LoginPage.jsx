import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setInfo('');
      const data = await fetchJson(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      navigate('/home');
    } catch (err) {
      setError(String(err && err.message ? err.message : err));
    }
  };

  const resendVerification = async () => {
    const e = String(email || '').trim();
    if (!e) return;
    try {
      setResendLoading(true);
      setError('');
      setInfo('');
      await fetchJson(`${API_BASE}/api/auth/verify/request`, {
        method: 'POST',
        body: JSON.stringify({ email: e }),
      });
      setInfo('If verification is enabled, we sent a new link to your email.');
    } catch (e2) {
      setError(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="app-page">
      <div className="card">
        <h2 className="card-title">Sign in to CareerAI</h2>

        <form className="form-group" onSubmit={handleSubmit}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="error">{error}</div>}
          {info && <div className="notice">{info}</div>}

          {String(error || '').toLowerCase().includes('not verified') && (
            <button
              type="button"
              className="button button--ghost"
              onClick={resendVerification}
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending…' : 'Resend verification email'}
            </button>
          )}

          <button type="submit" className="button">
            Sign in
          </button>

          <Link to="/forgot-password" className="link" style={{ marginTop: 10 }}>
            Forgot password?
          </Link>

          <Link to="/register" className="link">
            Create an account
          </Link>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
