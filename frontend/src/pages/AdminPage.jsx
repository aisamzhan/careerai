import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

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

async function fetchBlob(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data && data.error ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.blob();
}

function AdminPage() {
  const navigate = useNavigate();
  const [user] = useState(() => safeJsonParse(localStorage.getItem('currentUser')));
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsMsg, setRequestsMsg] = useState('');
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem('authToken'), []);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError('');
        setLoadingMe(true);
        const t = localStorage.getItem('authToken');
        if (!t) throw new Error('Missing auth token. Please sign in again.');
        const me = await fetchJson(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!mounted) return;
        setIsAdmin(Boolean(me && me.isAdmin));
      } catch (e) {
        if (!mounted) return;
        setError(String(e && e.message ? e.message : e));
        setIsAdmin(false);
      } finally {
        if (mounted) setLoadingMe(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        setError('');
        setLoadingUsers(true);
        const t = localStorage.getItem('authToken');
        if (!t) throw new Error('Missing auth token. Please sign in again.');
        const data = await fetchJson(`${API_BASE}/api/admin/users?limit=500`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!mounted) return;
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e && e.message ? e.message : e));
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        setAuditLoading(true);
        const t = localStorage.getItem('authToken');
        if (!t) return;
        const data = await fetchJson(`${API_BASE}/api/admin/audit?limit=50`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!mounted) return;
        setAudit(Array.isArray(data.audit) ? data.audit : []);
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setAuditLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        setRequestsMsg('');
        setRequestsLoading(true);
        const t = localStorage.getItem('authToken');
        if (!t) throw new Error('Missing auth token. Please sign in again.');
        const data = await fetchJson(`${API_BASE}/api/admin/payment-requests?limit=200`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!mounted) return;
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch (e) {
        if (!mounted) return;
        setRequestsMsg(String(e && e.message ? e.message : e));
      } finally {
        if (mounted) setRequestsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const approveRequest = async (id) => {
    try {
      setRequestsMsg('');
      const t = localStorage.getItem('authToken');
      if (!t) throw new Error('Missing auth token');
      await fetchJson(`${API_BASE}/api/admin/payment-requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      // Refresh requests
      const data = await fetchJson(`${API_BASE}/api/admin/payment-requests?limit=200`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setRequestsMsg('Approved.');
    } catch (e) {
      setRequestsMsg(String(e && e.message ? e.message : e));
    }
  };

  const openReceipt = async (id) => {
    try {
      setRequestsMsg('');
      const t = localStorage.getItem('authToken');
      if (!t) throw new Error('Missing auth token');
      const blob = await fetchBlob(`${API_BASE}/api/admin/payment-requests/${id}/receipt`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Let browser load it, then it can be revoked later.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setRequestsMsg(String(e && e.message ? e.message : e));
    }
  };

  if (!user) {
    return (
      <div className="app-page app-page--with-navbar">
        <div className="card">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page app-page--with-navbar">
      <div className="dashboard">
        <div className="card dashboard__panel">
          <h2 className="panel-title">Admin</h2>
          <p className="muted">This area is restricted to approved admin emails.</p>

          {error && <div className="error error--left">{error}</div>}

          {loadingMe ? (
            <div className="notice">
              <div className="notice__row">
                <span className="notice__label">Access</span>
                <span className="notice__value">Checking...</span>
              </div>
            </div>
          ) : !isAdmin ? (
            <div className="empty">
              <div className="empty__title">Access denied</div>
              <p className="empty__text">
                Your account is not in ADMIN_EMAILS on the backend. Ask the site owner to add your email.
              </p>
            </div>
          ) : (
            <div className="stack">
              <div className="notice">
                <div className="notice__row">
                  <span className="notice__label">Registered users</span>
                  <span className="notice__value">
                    {loadingUsers ? 'Loading...' : String(users.length)}
                  </span>
                </div>
                <div className="notice__small">
                  Sorted by newest first. Passwords are not stored in plain text.
                </div>
              </div>

              {!loadingUsers && users.length === 0 && (
                <div className="empty">
                  <div className="empty__title">No users yet</div>
                  <p className="empty__text">Once people register, they will show up here.</p>
                </div>
              )}

              {!loadingUsers && users.length > 0 && (
                <div className="stack">
                  {users.map((u) => (
                    <div className="notice" key={u.id}>
                      <div className="notice__row">
                        <span className="notice__label">{u.name || 'User'}</span>
                        <span className="notice__value">
                          {u.created_at ? new Date(u.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                      <div className="notice__small">{u.email}</div>
                      <div className="notice__small">University: {u.university || 'Not set'}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="qa">
                <div className="qa__title">Payment requests (Kaspi)</div>
                <div className="muted muted--small">
                  {requestsLoading ? 'Loading...' : `Pending/approved list: ${requests.length}`}
                </div>
                {requestsMsg && <div className="muted muted--small">{requestsMsg}</div>}
                {!requestsLoading && requests.length === 0 && (
                  <div className="empty" style={{ marginTop: '10px' }}>
                    <div className="empty__title">No payment requests</div>
                    <p className="empty__text">Users will submit transaction IDs from the Home page.</p>
                  </div>
                )}
                {!requestsLoading && requests.length > 0 && (
                  <div className="stack" style={{ marginTop: '10px' }}>
                    {requests.map((r) => (
                      <div className="notice" key={r.id}>
                        <div className="notice__row">
                          <span className="notice__label">{r.status}</span>
                          <span className="notice__value">{r.amount_kzt} KZT</span>
                        </div>
                        <div className="notice__small">User: {r.email}</div>
                        <div className="notice__small">Sender: {r.payer_account || '—'}</div>
                        <div className="notice__small">Transaction ID: {r.transaction_id}</div>
                        {!!r.notes && <div className="notice__small">Notes: {r.notes}</div>}
                        {r.has_receipt && (
                          <div style={{ marginTop: '10px' }}>
                            <button className="button button--sm button--ghost" type="button" onClick={() => openReceipt(r.id)}>
                              Open receipt screenshot
                            </button>
                          </div>
                        )}
                        {r.status === 'pending' && (
                          <div style={{ marginTop: '10px' }}>
                            <button className="button button--sm" type="button" onClick={() => approveRequest(r.id)}>
                              Approve (activate 30 days)
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="qa">
                <div className="qa__title">Admin audit</div>
                <div className="muted muted--small">
                  {auditLoading ? 'Loading...' : `Latest actions: ${audit.length}`}
                </div>
                {!auditLoading && audit.length === 0 && (
                  <div className="empty" style={{ marginTop: '10px' }}>
                    <div className="empty__title">No actions yet</div>
                    <p className="empty__text">Approvals will appear here.</p>
                  </div>
                )}
                {!auditLoading && audit.length > 0 && (
                  <div className="stack" style={{ marginTop: '10px' }}>
                    {audit.map((a) => (
                      <div className="notice" key={a.id}>
                        <div className="notice__row">
                          <span className="notice__label">{a.action}</span>
                          <span className="notice__value">
                            {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <div className="notice__small">Admin: {a.admin_email}</div>
                        <div className="notice__small">
                          {a.entity_type}: {a.entity_id}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card dashboard__panel">
          <h2 className="panel-title">Admin checklist</h2>
          <p className="muted">If you do not see users here, verify backend environment variables.</p>
          <div className="stack">
            <div className="role-result">
              <div className="role-result__name">Backend env vars</div>
              <div className="role-result__hint">DATABASE_URL set and points to Postgres</div>
              <div className="role-result__hint">AUTH_TOKEN_SECRET set (long random string)</div>
              <div className="role-result__hint">ADMIN_EMAILS includes your email</div>
            </div>
            <div className="role-result">
              <div className="role-result__name">Frontend env vars</div>
              <div className="role-result__hint">VITE_API_BASE points to deployed backend URL</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
