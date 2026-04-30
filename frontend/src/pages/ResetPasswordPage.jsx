import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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

function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get('token') || '').trim(), [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!token) {
      setError('Missing reset token. Please open the link from your email.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await fetchJson(`${API_BASE}/api/auth/password-reset/confirm`, {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      setInfo('Password updated. You can now sign in.');
      setPassword('');
      setConfirm('');
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
          Choose a new password
        </h1>
        <p className="muted" style={{ marginBottom: 18 }}>
          Set a new password for your account.
        </p>

        <form className="form-group" onSubmit={onSubmit}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}
          {info && (
            <div className="empty">
              <div className="empty__title">Success</div>
              <p className="empty__text">{info}</p>
              <div style={{ marginTop: 12 }}>
                <Link className="button button--sm" to="/login">
                  Go to sign in
                </Link>
              </div>
            </div>
          )}

          {!info && (
            <>
              <button className="button" type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <Link to="/login" className="link">
                Back to sign in
              </Link>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;

