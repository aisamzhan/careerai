import { useState } from 'react';
import { Link } from 'react-router-dom';

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

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = String(email || '').trim();
    if (!v) return;

    try {
      setLoading(true);
      setError('');
      setInfo('');
      await fetchJson(`${API_BASE}/api/auth/password-reset/request`, {
        method: 'POST',
        body: JSON.stringify({ email: v }),
      });
      setInfo('If this email exists, we sent a password reset link.');
    } catch (e2) {
      setError(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page app-page--with-navbar">
      <div className="card" style={{ maxWidth: 560 }}>
        <h1 className="card-title" style={{ marginBottom: 12 }}>
          Reset password
        </h1>
        <p className="muted" style={{ marginBottom: 18 }}>
          Enter your email and we will send a reset link.
        </p>

        <form className="form-group" onSubmit={onSubmit}>
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}
          {info && <div className="notice">{info}</div>}

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <Link to="/login" className="link">
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

