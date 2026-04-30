import { useEffect, useMemo, useState } from 'react';
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

function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get('token') || '').trim(), [params]);

  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return;
      try {
        setStatus('loading');
        setError('');
        await fetchJson(`${API_BASE}/api/auth/verify/confirm`, {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (!mounted) return;
        setStatus('ok');
      } catch (e) {
        if (!mounted) return;
        setStatus('error');
        setError(String(e && e.message ? e.message : e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="app-page app-page--with-navbar">
      <div className="card dashboard__panel" style={{ maxWidth: 620 }}>
        <h1 className="panel-title">Verify email</h1>
        <p className="muted">
          {token
            ? 'We are verifying your email. This usually takes a second.'
            : 'Missing verification token. Please open the link from your email.'}
        </p>

        {status === 'loading' && <div className="empty">Verifying…</div>}
        {status === 'ok' && (
          <div className="empty">
            <div className="empty__title">Email verified</div>
            <p className="empty__text">
              You can now sign in.
            </p>
            <div style={{ marginTop: 12 }}>
              <Link className="button button--sm" to="/login">
                Go to sign in
              </Link>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="error error--left">
            {error || 'Verification failed. The link may be expired.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;

