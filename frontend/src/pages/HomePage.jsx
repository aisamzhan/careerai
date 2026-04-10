import { useEffect, useRef, useState } from 'react';
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

function toIntOrEmpty(value) {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) ? n : '';
}

const HomePage = () => {
  const navigate = useNavigate();

  const [user] = useState(() => safeJsonParse(localStorage.getItem('currentUser')));
  const [professions, setProfessions] = useState([]);
  const [loadingProfessions, setLoadingProfessions] = useState(true);

  const [form, setForm] = useState({
    city: '',
    englishLevel: '',
    kazakhLevel: '',
    russianLevel: '',
    experienceMonths: '',
    projectCount: '',
    technicalSkills: '',
    toolsSkills: '',
    softSkills: '',
    experienceText: '',
    targetProfessionId: '',
    targetCity: '',
    timelineMonths: '',
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [aiMode, setAiMode] = useState('short'); // short | plan30 | resume | interview | vacancy
  const [vacancyText, setVacancyText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [aiFeedbackMsg, setAiFeedbackMsg] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractInfo, setExtractInfo] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeInfo, setResumeInfo] = useState(null);
  const resumeInputRef = useRef(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingProfessions(true);
        const data = await fetchJson(`${API_BASE}/api/market/professions`);
        if (!mounted) return;
        setProfessions(data.professions || []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e && e.message ? e.message : e));
      } finally {
        if (mounted) setLoadingProfessions(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !user.email) return;
    const profileKey = `careerai_profile_v1_${user.email}`;
    const goalsKey = `careerai_goals_v1_${user.email}`;

    const savedProfile = safeJsonParse(localStorage.getItem(profileKey)) || {};
    const savedGoals = safeJsonParse(localStorage.getItem(goalsKey)) || {};

    setForm((prev) => ({
      ...prev,
      city: savedProfile.city || prev.city || '',
      englishLevel: savedProfile.englishLevel || prev.englishLevel || '',
      kazakhLevel: savedProfile.kazakhLevel || prev.kazakhLevel || '',
      russianLevel: savedProfile.russianLevel || prev.russianLevel || '',
      experienceMonths: toIntOrEmpty(savedProfile.experienceMonths ?? prev.experienceMonths),
      projectCount: toIntOrEmpty(savedProfile.projectCount ?? prev.projectCount),
      technicalSkills: savedProfile.technicalSkills || prev.technicalSkills || '',
      toolsSkills: savedProfile.toolsSkills || prev.toolsSkills || '',
      softSkills: savedProfile.softSkills || prev.softSkills || '',
      experienceText: savedProfile.experienceText || prev.experienceText || '',
      targetProfessionId: savedGoals.targetProfessionId || prev.targetProfessionId || '',
      targetCity: savedGoals.targetCity || prev.targetCity || '',
      timelineMonths: toIntOrEmpty(savedGoals.timelineMonths ?? prev.timelineMonths),
    }));
  }, [user]);

  const handleChange = (key) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setAnalysis(null);
    setAiAnswer('');
    setAiError('');
    setAnalyzing(true);

    const profilePayload = {
      name: user.name || '',
      university: user.university || '',
      email: user.email || '',
      city: form.city || '',
      englishLevel: form.englishLevel || '',
      kazakhLevel: form.kazakhLevel || '',
      russianLevel: form.russianLevel || '',
      experienceMonths: Number(form.experienceMonths || 0) || 0,
      projectCount: Number(form.projectCount || 0) || 0,
      technicalSkills: form.technicalSkills || '',
      toolsSkills: form.toolsSkills || '',
      softSkills: form.softSkills || '',
      experienceText: form.experienceText || '',
    };

    const goalsPayload = {
      targetProfessionId: form.targetProfessionId || null,
      targetCity: form.targetCity || '',
      timelineMonths: Number(form.timelineMonths || 0) || null,
    };

    try {
      const data = await fetchJson(`${API_BASE}/api/career-assessment`, {
        method: 'POST',
        body: JSON.stringify({ profile: profilePayload, goals: goalsPayload }),
      });

      setAnalysis(data);

      if (user.email) {
        const profileKey = `careerai_profile_v1_${user.email}`;
        const goalsKey = `careerai_goals_v1_${user.email}`;
        localStorage.setItem(profileKey, JSON.stringify(profilePayload));
        localStorage.setItem(
          goalsKey,
          JSON.stringify({ ...goalsPayload, targetProfessionId: form.targetProfessionId || '' }),
        );
      }
    } catch (e2) {
      setError(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskAI = async () => {
    if (!analysis) return;
    const q = String(question || '').trim();
    if (!q) return;

    setAiLoading(true);
    setAiError('');
    setAiAnswer('');
    setAiFeedbackMsg('');

    const profilePayload = {
      name: user?.name || '',
      university: user?.university || '',
      email: user?.email || '',
      city: form.city || '',
      englishLevel: form.englishLevel || '',
      kazakhLevel: form.kazakhLevel || '',
      russianLevel: form.russianLevel || '',
      experienceMonths: Number(form.experienceMonths || 0) || 0,
      projectCount: Number(form.projectCount || 0) || 0,
      technicalSkills: form.technicalSkills || '',
      toolsSkills: form.toolsSkills || '',
      softSkills: form.softSkills || '',
      experienceText: form.experienceText || '',
    };

    const goalsPayload = {
      targetProfessionId: form.targetProfessionId || null,
      targetCity: form.targetCity || '',
      timelineMonths: Number(form.timelineMonths || 0) || null,
    };

    try {
      const data = await fetchJson(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: q,
          profile: profilePayload,
          goals: goalsPayload,
          mode: aiMode,
          vacancyText: aiMode === 'vacancy' ? vacancyText : '',
          preferredLanguage: /[А-Яа-яЁё]/.test(q) ? 'ru' : 'en',
        }),
      });
      setAiAnswer(data.answer || '');
    } catch (e) {
      setAiError(String(e && e.message ? e.message : e));
    } finally {
      setAiLoading(false);
    }
  };

  const aiPlaceholder =
    aiMode === 'resume'
      ? 'Example: improve my resume for the target role (3 concrete edits).'
      : aiMode === 'plan30'
        ? 'Example: create a short 30-day plan for my goal.'
        : aiMode === 'interview'
          ? 'Example: what interview questions should I prepare for?'
          : aiMode === 'vacancy'
            ? 'Example: compare me to this vacancy and list the top 3 gaps.'
            : 'Example: what 3 skills should I focus on first?';

  const handleExtractSkills = async () => {
    setExtractError('');
    setExtractInfo('');
    setExtractLoading(true);
    try {
      const text = [form.technicalSkills, form.toolsSkills, form.experienceText].filter(Boolean).join('\n');
      const data = await fetchJson(`${API_BASE}/api/profile/extract`, {
        method: 'POST',
        body: JSON.stringify({
          text,
          existing: {
            technicalSkills: form.technicalSkills,
            toolsSkills: form.toolsSkills,
            softSkills: form.softSkills,
          },
        }),
      });
      const merged = data && data.merged ? data.merged : null;
      if (merged) {
        const beforeTech = String(form.technicalSkills || '');
        const beforeTools = String(form.toolsSkills || '');
        const beforeSoft = String(form.softSkills || '');

        setForm((prev) => ({
          ...prev,
          technicalSkills: merged.technicalSkillsCsv || prev.technicalSkills,
          toolsSkills: merged.toolsSkillsCsv || prev.toolsSkills,
          softSkills: merged.softSkillsCsv || prev.softSkills,
        }));

        const afterTech = String(merged.technicalSkillsCsv || '');
        const afterTools = String(merged.toolsSkillsCsv || '');
        const afterSoft = String(merged.softSkillsCsv || '');

        const changed =
          beforeTech.trim() !== afterTech.trim() ||
          beforeTools.trim() !== afterTools.trim() ||
          beforeSoft.trim() !== afterSoft.trim();

        setExtractInfo(
          changed
            ? 'Skills detected and added to the fields.'
            : 'No new skills found in the text (nothing to update).',
        );
      }
    } catch (e) {
      setExtractError(String(e && e.message ? e.message : e));
    } finally {
      setExtractLoading(false);
    }
  };

  const handleParseResume = async () => {
    if (!resumeFile) return;
    setResumeError('');
    setResumeInfo(null);
    setResumeLoading(true);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append(
        'existing',
        JSON.stringify({
          technicalSkills: form.technicalSkills,
          toolsSkills: form.toolsSkills,
          softSkills: form.softSkills,
        }),
      );

      const res = await fetch(`${API_BASE}/api/resume/parse`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data && data.error ? data.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }

      setResumeInfo(data);

      const p = (data && data.profile) || {};
      const csv = (data && data.profileCsv) || {};

      setForm((prev) => ({
        ...prev,
        city: p.city || prev.city || '',
        englishLevel: p.englishLevel || prev.englishLevel || '',
        kazakhLevel: p.kazakhLevel || prev.kazakhLevel || '',
        russianLevel: p.russianLevel || prev.russianLevel || '',
        experienceMonths: p.experienceMonths ?? prev.experienceMonths,
        projectCount: p.projectCount ?? prev.projectCount,
        technicalSkills: csv.technicalSkills || prev.technicalSkills || '',
        toolsSkills: csv.toolsSkills || prev.toolsSkills || '',
        softSkills: csv.softSkills || prev.softSkills || '',
        experienceText: p.experienceText || prev.experienceText || '',
      }));
    } catch (e) {
      setResumeError(String(e && e.message ? e.message : e));
    } finally {
      setResumeLoading(false);
    }
  };

  const sendAiFeedback = async (rating) => {
    if (!aiAnswer) return;
    setAiFeedbackLoading(true);
    setAiFeedbackMsg('');
    try {
      await fetchJson(`${API_BASE}/api/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'ai_chat',
          rating,
          message: String(question || '').trim(),
          answer: aiAnswer,
          meta: {
            mode: aiMode,
            targetProfessionId: form.targetProfessionId || null,
          },
        }),
      });
      setAiFeedbackMsg('Thanks, feedback saved.');
    } catch (e) {
      setAiFeedbackMsg(`Failed to send feedback: ${String(e && e.message ? e.message : e)}`);
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  const name = user ? user.name : 'Student';

  return (
    <div className="app-page app-page--with-navbar">
      <div className="dashboard">
        <div className="card dashboard__panel">
          <h2 className="panel-title">Profile and Resume</h2>
          <p className="muted">
            Fill in your profile and goals. CareerAI compares your skills and experience with role requirements in
            Kazakhstan and gives a fit estimate plus next steps.
          </p>

          <form className="form" onSubmit={handleAnalyze}>
            <div className="qa">
              <div className="qa__title">Resume import (.docx)</div>
              <div className="row">
                <label className="field">
                  <span className="field__label">Upload .docx</span>
                  <input
                    ref={resumeInputRef}
                    className="file-hidden"
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const f = e && e.target && e.target.files ? e.target.files[0] : null;
                      setResumeFile(f || null);
                    }}
                  />
                  <div className="file-picker">
                    <button
                      className="button button--sm button--ghost"
                      type="button"
                      onClick={() => resumeInputRef.current && resumeInputRef.current.click()}
                    >
                      Choose .docx file
                    </button>
                    <div className="muted muted--small">
                      {resumeFile ? resumeFile.name : 'No file selected'}
                    </div>
                  </div>
                  <span className="field__hint">
                    We will extract text and auto-fill fields. Missing data will be left blank.
                  </span>
                </label>

                <div className="field" style={{ alignContent: 'end' }}>
                  <span className="field__label">Action</span>
                  <button
                    className="button"
                    type="button"
                    onClick={handleParseResume}
                    disabled={!resumeFile || resumeLoading}
                  >
                    {resumeLoading ? 'Parsing resume...' : 'Parse and fill'}
                  </button>
                </div>
              </div>

              {resumeError && <div className="error error--left">{resumeError}</div>}

              {resumeInfo && (
                <div className="notice" style={{ marginTop: '10px' }}>
                  <div className="notice__row">
                    <span className="notice__label">Parsed</span>
                    <span className="notice__value">
                      {resumeInfo.fileName || 'resume.docx'} ({resumeInfo.extractedTextChars || 0} chars)
                    </span>
                  </div>
                  {!!resumeInfo.missingFields?.length && (
                    <div className="notice__small">Missing: {resumeInfo.missingFields.join(', ')}</div>
                  )}
                  {!!resumeInfo.notes?.length && <div className="notice__small">Notes: {resumeInfo.notes.join(' ')}</div>}
                </div>
              )}
            </div>

            <div className="row">
              <label className="field">
                <span className="field__label">Name</span>
                <input className="input" value={name} disabled />
              </label>

              <label className="field">
                <span className="field__label">University</span>
                <input className="input" value={user?.university || ''} disabled />
              </label>
            </div>

            <div className="row">
              <label className="field">
                <span className="field__label">City (current)</span>
                <input
                  className="input"
                  placeholder="Almaty, Astana, ..."
                  value={form.city}
                  onChange={handleChange('city')}
                />
              </label>

              <label className="field">
                <span className="field__label">English level</span>
                <select className="select" value={form.englishLevel} onChange={handleChange('englishLevel')}>
                  <option value="">Select...</option>
                  <option value="A1">A1 (beginner)</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </label>
            </div>

            <div className="row">
              <label className="field">
                <span className="field__label">Kazakh level</span>
                <select className="select" value={form.kazakhLevel} onChange={handleChange('kazakhLevel')}>
                  <option value="">Select...</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </label>

              <label className="field">
                <span className="field__label">Russian level</span>
                <select className="select" value={form.russianLevel} onChange={handleChange('russianLevel')}>
                  <option value="">Select...</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                  <option value="native">Native</option>
                </select>
              </label>
            </div>

            <div className="row">
              <label className="field">
                <span className="field__label">Experience (months)</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.experienceMonths}
                  onChange={handleChange('experienceMonths')}
                />
              </label>

              <label className="field">
                <span className="field__label">Projects (count)</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.projectCount}
                  onChange={handleChange('projectCount')}
                />
              </label>
            </div>

            <label className="field">
              <span className="field__label">Technical skills (comma-separated)</span>
              <textarea
                className="textarea"
                placeholder="JavaScript, React, Node.js, SQL, ..."
                value={form.technicalSkills}
                onChange={handleChange('technicalSkills')}
              />
            </label>

            <label className="field">
              <span className="field__label">Tools / platforms (comma-separated)</span>
              <textarea
                className="textarea"
                placeholder="Git, GitHub, Figma, Power BI, 1C, ..."
                value={form.toolsSkills}
                onChange={handleChange('toolsSkills')}
              />
            </label>

            <label className="field">
              <span className="field__label">Soft skills (comma-separated)</span>
              <textarea
                className="textarea"
                placeholder="Communication, Teamwork, Problem Solving, ..."
                value={form.softSkills}
                onChange={handleChange('softSkills')}
              />
            </label>

            <label className="field">
              <span className="field__label">Experience / projects (short, optional)</span>
              <textarea
                className="textarea"
                placeholder="Example: internship, pet projects, freelance, achievements..."
                value={form.experienceText}
                onChange={handleChange('experienceText')}
              />
              <span className="field__hint">Keep it short: 3-6 lines.</span>
              <div className="field-actions">
                <button
                  className="button button--sm"
                  type="button"
                  onClick={handleExtractSkills}
                  disabled={extractLoading || !(form.experienceText || form.technicalSkills || form.toolsSkills)}
                >
                  {extractLoading ? 'Detecting skills...' : 'Auto-detect skills from text'}
                </button>
                {extractError && <div className="error error--left">{extractError}</div>}
                {extractInfo && <div className="notice__small">{extractInfo}</div>}
              </div>
            </label>

            <div className="divider" />

            <h3 className="panel-subtitle">Goals</h3>

            <div className="row">
                <label className="field">
                <span className="field__label">Target profession</span>
                <select
                  className="select"
                  value={form.targetProfessionId}
                  onChange={handleChange('targetProfessionId')}
                  disabled={loadingProfessions}
                >
                  <option value="">{loadingProfessions ? 'Loading...' : 'Select...'}</option>
                  {professions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.demandLevel})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">Target city</span>
                <input
                  className="input"
                  placeholder="Almaty, Astana, Atyrau..."
                  value={form.targetCity}
                  onChange={handleChange('targetCity')}
                />
              </label>
            </div>

            <label className="field">
              <span className="field__label">Timeline (months)</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="3"
                value={form.timelineMonths}
                onChange={handleChange('timelineMonths')}
              />
            </label>

            {error && <div className="error">{error}</div>}

            <button className="button" type="submit" disabled={analyzing}>
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
        </div>

        <div className="card dashboard__panel">
          <h2 className="panel-title">CareerAI Analysis</h2>
          <p className="muted">The fit estimate is based on matching your profile with Kazakhstan labor market data.</p>

          {!analysis && (
            <div className="empty">
              <p className="empty__title">Ready when you are</p>
              <p className="empty__text">
                Fill in your profile and click Analyze. If you do not pick a target profession, CareerAI will show the
                top matches.
              </p>
            </div>
          )}

          {analysis && (
            <div className="stack">
              <div className="notice">
                <div className="notice__row">
                  <span className="notice__label">Knowledge Base</span>
                  <span className="notice__value">updated {analysis?.meta?.marketLastUpdated || 'N/A'}</span>
                </div>
                <div className="notice__row" style={{ marginTop: '6px' }}>
                  <span className="notice__label">Profile</span>
                  <span className="notice__value">{analysis?.profileCoverage?.percent ?? 0}% complete</span>
                </div>
                <div className="notice__small">{analysis.disclaimer}</div>
                {!Array.isArray(analysis?.goals?.targetProfessionIds) && (
                  <div className="notice__small">Showing top 3 matches. Pick a target profession to focus the analysis.</div>
                )}
              </div>

              {Array.isArray(analysis.results) &&
                (Array.isArray(analysis?.goals?.targetProfessionIds)
                  ? analysis.results
                  : analysis.results.slice(0, 3)
                ).map((r) => (
                  <div key={r.professionId} className="role-result">
                    <div className="role-result__top">
                      <div>
                        <div className="role-result__name">{r.professionName}</div>
                        <div className="role-result__meta">
                          Demand: <strong>{r.demandLevel}</strong>
                        </div>
                      </div>
                      <div className="role-result__score">
                        {r.fitScore}
                        <span className="role-result__scoreUnit">%</span>
                      </div>
                    </div>

                    <div className="role-result__grid">
                      <div className="role-result__block">
                        <div className="role-result__label">Strengths</div>
                        {r.matchedSkills.length ? (
                          <div className="chips">
                            {r.matchedSkills.map((s) => (
                              <span key={s} className="chip chip--ok">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="role-result__hint">No matches for must-have skills.</div>
                        )}
                      </div>

                      <div className="role-result__block">
                        <div className="role-result__label">Gaps</div>
                        {r.missingSkills.length ? (
                          <div className="chips">
                            {r.missingSkills.map((s) => (
                              <span key={s} className="chip chip--warn">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="role-result__hint">All must-have skills are covered.</div>
                        )}
                      </div>
                    </div>

                    <div className="role-result__block">
                      <div className="role-result__label">Salary (KZT / month)</div>
                      <div className="role-result__hint">
                        Junior: {r.salaryRangesKZT?.entry?.text} | Middle: {r.salaryRangesKZT?.mid?.text} | Senior:{' '}
                        {r.salaryRangesKZT?.senior?.text}
                      </div>
                    </div>

                    {!!r.recommendations?.length && (
                      <div className="role-result__block">
                        <div className="role-result__label">Recommendations</div>
                        <ul className="list">
                          {r.recommendations.map((rec) => (
                            <li key={`${r.professionId}-${rec.area}`}>{rec.suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!r.careerPath?.length && (
                      <div className="role-result__block">
                        <div className="role-result__label">Career path</div>
                        <div className="role-result__hint">{r.careerPath.join(' → ')}</div>
                      </div>
                    )}

                    {!!r.marketNotes?.length && (
                      <div className="role-result__block">
                        <div className="role-result__label">KZ market notes</div>
                        <div className="role-result__hint">{r.marketNotes.join(' ')}</div>
                      </div>
                    )}

                    <div className="role-result__block">
                      <div className="role-result__label">Action plan</div>
                      <div className="plan">
                        <div className="plan__col">
                          <div className="plan__title">2 weeks</div>
                          <ul className="list">
                            {r.actionPlan.twoWeeks.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="plan__col">
                          <div className="plan__title">30 days</div>
                          <ul className="list">
                            {r.actionPlan.thirtyDays.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="plan__col">
                          <div className="plan__title">90 days</div>
                          <ul className="list">
                            {r.actionPlan.ninetyDays.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {!!analysis.questions?.length && (
                <div className="qa">
                  <div className="qa__title">Clarifying questions</div>
                  <ul className="list">
                    {analysis.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="qa">
                <div className="qa__title">Ask CareerAI (AI)</div>
                <div className="qa__row">
                  <label className="field field--tight">
                    <span className="field__label">Mode</span>
                    <select className="select" value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
                      <option value="short">Short and direct</option>
                      <option value="plan30">30-day plan</option>
                      <option value="resume">Resume</option>
                      <option value="interview">Interview</option>
                      <option value="vacancy">Match a vacancy</option>
                    </select>
                  </label>
                </div>
                {aiMode === 'vacancy' && (
                  <div className="field" style={{ marginTop: '10px' }}>
                    <span className="field__label">Vacancy text</span>
                    <textarea
                      className="textarea"
                      placeholder="Paste the vacancy: requirements, responsibilities, tech stack..."
                      value={vacancyText}
                      onChange={(e) => setVacancyText(e.target.value)}
                    />
                    <span className="field__hint">Copy from hh/LinkedIn/Telegram and paste here.</span>
                  </div>
                )}
                <div className="field" style={{ marginTop: '10px' }}>
                  <span className="field__label">Question</span>
                  <textarea
                    className="textarea"
                    placeholder={aiPlaceholder}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </div>
                {aiError && <div className="error">{aiError}</div>}
                <button className="button" type="button" onClick={handleAskAI} disabled={aiLoading}>
                  {aiLoading ? 'Thinking...' : 'Ask'}
                </button>
                {aiAnswer && (
                  <>
                    <pre className="ai-answer">{aiAnswer}</pre>
                    <div className="feedback-row">
                      <button
                        className="button button--sm button--ghost"
                        type="button"
                        disabled={aiFeedbackLoading}
                        onClick={() => sendAiFeedback('up')}
                      >
                        Helpful
                      </button>
                      <button
                        className="button button--sm button--ghost"
                        type="button"
                        disabled={aiFeedbackLoading}
                        onClick={() => sendAiFeedback('down')}
                      >
                        Not helpful
                      </button>
                      {aiFeedbackMsg && <div className="muted muted--small">{aiFeedbackMsg}</div>}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
