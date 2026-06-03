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

function formatList(value) {
  const s = String(value || '').trim();
  if (!s) return 'Not set';
  return s;
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function ProfilePage() {
  const navigate = useNavigate();
  const [user] = useState(() => safeJsonParse(localStorage.getItem('currentUser')));
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !user.email) return;
    let mounted = true;
    (async () => {
      try {
        setAdminError('');
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const data = await fetchJson(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setAdmin(Boolean(data && data.isAdmin));
      } catch {
        if (!mounted) return;
        // Ignore for non-auth sessions; show only if needed.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const storageKeys = useMemo(() => {
    if (!user || !user.email) return { profileKey: null, goalsKey: null };
    return {
      profileKey: `careerai_profile_v1_${user.email}`,
      goalsKey: `careerai_goals_v1_${user.email}`,
    };
  }, [user]);

  const savedProfile = useMemo(() => {
    if (!storageKeys.profileKey) return {};
    return safeJsonParse(localStorage.getItem(storageKeys.profileKey)) || {};
  }, [storageKeys.profileKey]);

  const savedGoals = useMemo(() => {
    if (!storageKeys.goalsKey) return {};
    return safeJsonParse(localStorage.getItem(storageKeys.goalsKey)) || {};
  }, [storageKeys.goalsKey]);

  useEffect(() => {
    if (!user || !user.email) return;
    let mounted = true;
    (async () => {
      try {
        setError('');
        setLoading(true);
        const data = await fetchJson(`${API_BASE}/api/career-assessment`, {
          method: 'POST',
          body: JSON.stringify({
            profile: savedProfile || {},
            goals: savedGoals || {},
          }),
        });
        if (!mounted) return;
        setAssessment(data);
      } catch (e) {
        if (!mounted) return;
        setError(String(e && e.message ? e.message : e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, savedProfile, savedGoals]);

  useEffect(() => {
    if (!admin) return;
    let mounted = true;
    (async () => {
      try {
        setAdminError('');
        setAdminLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Missing auth token');
        const data = await fetchJson(`${API_BASE}/api/admin/users?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setAdminUsers(Array.isArray(data.users) ? data.users : []);
      } catch (e) {
        if (!mounted) return;
        setAdminError(String(e && e.message ? e.message : e));
      } finally {
        if (mounted) setAdminLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [admin]);

  if (!user) {
    return (
      <div className="app-page app-page--with-navbar">
        <div className="card">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  const topResult = assessment?.top || (Array.isArray(assessment?.results) ? assessment.results[0] : null);
  const profilePercent = assessment?.profileCoverage?.percent ?? 0;
  const missingCount = assessment?.profileCoverage?.missingKeys?.length || 0;
  const skillCount =
    splitCsv(savedProfile.technicalSkills).length +
    splitCsv(savedProfile.toolsSkills).length +
    splitCsv(savedProfile.softSkills).length;
  const summaryText = [
    `Name: ${user.name || 'Student'}`,
    `University: ${user.university || 'Not set'}`,
    `City: ${savedProfile.city || 'Not set'}`,
    `Languages: English ${savedProfile.englishLevel || 'N/A'}, Kazakh ${savedProfile.kazakhLevel || 'N/A'}, Russian ${savedProfile.russianLevel || 'N/A'}`,
    `Experience: ${savedProfile.experienceMonths || 0} months, ${savedProfile.projectCount || 0} projects`,
    `Technical skills: ${formatList(savedProfile.technicalSkills)}`,
    `Tools: ${formatList(savedProfile.toolsSkills)}`,
    `Soft skills: ${formatList(savedProfile.softSkills)}`,
    `Goal: ${savedGoals.targetProfessionId || 'Not set'} in ${savedGoals.targetCity || 'Not set'}`,
    topResult ? `Current top fit: ${topResult.professionName} (${topResult.fitScore}%)` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyMsg('Summary copied.');
    } catch {
      setCopyMsg('Copy failed. You can select the snapshot manually.');
    }
  };

  return (
    <div className="app-page app-page--with-navbar">
      <div className="dashboard">
        <div className="card dashboard__panel">
          <h2 className="panel-title">User Profile</h2>
          <p className="muted">
            This page shows what CareerAI currently knows about you (saved Profile/Goals) and your profile completeness.
          </p>

          <div className="stack">
            <div className="profileHero">
              <div>
                <div className="profileHero__eyebrow">Career profile</div>
                <div className="profileHero__name">{user.name || 'Student'}</div>
                <div className="profileHero__meta">{user.university || 'University not set'} | {user.email}</div>
              </div>
              <div className="profileHero__fit">
                <strong>{loading ? '...' : `${profilePercent}%`}</strong>
                <span>complete</span>
              </div>
            </div>

            {error && <div className="error error--left">{error}</div>}

            <div className="profileStats">
              <div className="profileStat">
                <span>Skills</span>
                <strong>{skillCount}</strong>
              </div>
              <div className="profileStat">
                <span>Experience</span>
                <strong>{savedProfile.experienceMonths || 0} mo</strong>
              </div>
              <div className="profileStat">
                <span>Missing fields</span>
                <strong>{loading ? '...' : missingCount}</strong>
              </div>
            </div>

            {!!topResult && (
              <div className="notice">
                <div className="notice__row">
                  <span className="notice__label">Top fit estimate</span>
                  <span className="notice__value">
                    {topResult.professionName} ({topResult.fitScore}%)
                  </span>
                </div>
                {!!topResult.confidenceReason && (
                  <div className="notice__small">
                    Confidence: {topResult.confidence} ({topResult.confidenceReason})
                  </div>
                )}
              </div>
            )}

            <div className="field-actions">
              <button className="button" type="button" onClick={() => navigate('/home')}>
                Go to Home (edit profile)
              </button>
              <button className="button button--ghost" type="button" onClick={copySummary}>
                Copy profile summary
              </button>
              <button
                className="button button--ghost"
                type="button"
                onClick={() => {
                  if (storageKeys.profileKey) localStorage.removeItem(storageKeys.profileKey);
                  if (storageKeys.goalsKey) localStorage.removeItem(storageKeys.goalsKey);
                  setAssessment(null);
                }}
              >
                Clear saved Profile/Goals
              </button>
              {copyMsg && <div className="notice__small">{copyMsg}</div>}
            </div>
          </div>
        </div>

        <div className="card dashboard__panel">
          <h2 className="panel-title">Saved Profile Snapshot</h2>
          <p className="muted">These are the fields used in the CareerAI analysis. Empty fields are okay.</p>

          <div className="stack">
            <div className="role-result">
              <div className="role-result__top">
                <div>
                  <div className="role-result__name">Location and Languages</div>
                  <div className="role-result__meta">
                    City: {savedProfile.city || 'Not set'} | English: {savedProfile.englishLevel || 'Not set'} | Kazakh:{' '}
                    {savedProfile.kazakhLevel || 'Not set'} | Russian: {savedProfile.russianLevel || 'Not set'}
                  </div>
                </div>
                <div className="role-result__score">
                  {savedProfile.experienceMonths ? Number(savedProfile.experienceMonths) : 0}
                  <span className="role-result__scoreUnit">mo</span>
                </div>
              </div>
            </div>

            <div className="role-result">
              <div className="role-result__name">Skills</div>
              <div className="role-result__hint">Technical: {formatList(savedProfile.technicalSkills)}</div>
              <div className="role-result__hint">Tools: {formatList(savedProfile.toolsSkills)}</div>
              <div className="role-result__hint">Soft: {formatList(savedProfile.softSkills)}</div>
            </div>

            <div className="role-result">
              <div className="role-result__name">Goals</div>
              <div className="role-result__hint">Target profession: {savedGoals.targetProfessionId || 'Not set'}</div>
              <div className="role-result__hint">Target city: {savedGoals.targetCity || 'Not set'}</div>
              <div className="role-result__hint">Timeline (months): {savedGoals.timelineMonths || 'Not set'}</div>
            </div>

            {admin && (
              <div className="qa">
                <div className="qa__title">Admin: Registered users</div>
                <div className="muted muted--small">
                  {adminLoading
                    ? 'Loading users...'
                    : `Showing ${adminUsers.length} users (latest first).`}
                </div>
                {adminError && <div className="error error--left">{adminError}</div>}
                {!adminLoading && !adminError && adminUsers.length === 0 && (
                  <div className="empty" style={{ marginTop: '10px' }}>
                    <div className="empty__title">No users yet</div>
                    <p className="empty__text">Once people register, they will show up here.</p>
                  </div>
                )}
                {!adminLoading && !adminError && adminUsers.length > 0 && (
                  <div className="stack" style={{ marginTop: '10px' }}>
                    {adminUsers.slice(0, 50).map((u) => (
                      <div className="notice" key={u.id}>
                        <div className="notice__row">
                          <span className="notice__label">{u.name || 'User'}</span>
                          <span className="notice__value">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="notice__small">{u.email}</div>
                        <div className="notice__small">University: {u.university || 'Not set'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
