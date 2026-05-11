import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

function IconTarget(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8zm0-14a6 6 0 106 6 6.01 6.01 0 00-6-6zm0 10a4 4 0 114-4 4.01 4.01 0 01-4 4zm0-6a2 2 0 102 2 2 2 0 00-2-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconGap(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M4 6h10a2 2 0 012 2v10H6a2 2 0 01-2-2V6zm14 4h2v10a2 2 0 01-2 2H8v-2h10V10z"
        fill="currentColor"
      />
      <path d="M7 9h6v2H7V9zm0 4h7v2H7v-2z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function IconPlan(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M7 2h10a2 2 0 012 2v18H5V4a2 2 0 012-2zm0 2v16h10V4H7z"
        fill="currentColor"
      />
      <path
        d="M9 7h6v2H9V7zm0 4h6v2H9v-2zm0 4h4v2H9v-2z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

function IconProfile(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 12a5 5 0 10-5-5 5.01 5.01 0 005 5zm0-8a3 3 0 11-3 3 3 3 0 013-3z"
        fill="currentColor"
      />
      <path
        d="M4 22a8 8 0 0116 0h-2a6 6 0 00-12 0H4z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconDoc(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 1.5V8h4.5L14 3.5z"
        fill="currentColor"
      />
      <path d="M8 12h8v2H8v-2zm0 4h7v2H8v-2z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function IconChat(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v10h2h1v1.8L9.2 16H20V6H4z"
        fill="currentColor"
      />
      <path d="M7 9h10v2H7V9zm0 4h7v2H7v-2z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  const isAuthed = useMemo(() => Boolean(localStorage.getItem('authToken')), []);

  return (
    <div className="app-page app-page--with-navbar">
      <main className="landing" aria-label="CareerAI overview">
        <section className="landing__hero">
          <div className="landing__heroLeft">
            <div className="landing__badge">Built for Kazakhstan job market</div>
            <h1 className="landing__title">Your Career in Kazakhstan, Powered by AI.</h1>
            <p className="landing__lead">
              Upload your resume, choose a target role, and get a clear fit score, strengths, gaps, and
              next steps based on real requirements in Kazakhstan.
            </p>

            <div className="landing__cta">
              {isAuthed ? (
                <button className="button landing__ctaBtn" type="button" onClick={() => navigate('/home')}>
                  Open dashboard
                </button>
              ) : (
                <Link className="button landing__ctaBtn" to="/register">
                  Get started
                </Link>
              )}
              <Link className="button button--ghost landing__ctaBtn" to="/how-it-works">
                How it works
              </Link>
            </div>

            <div className="landing__fineprint">
              Resume import (.docx) and AI Chat are available with a 30-day subscription.
              <Link className="landing__fineprintLink" to="/pricing">
                {' '}
                See pricing
              </Link>
              .
            </div>
          </div>

          <div className="landing__heroRight" aria-label="Key benefits">
            <div className="landing__miniCard">
              <div className="landing__miniTop">
                <span className="landing__miniIcon landing__miniIcon--teal">
                  <IconTarget />
                </span>
                <div className="landing__miniTitle">Career fit</div>
              </div>
              <div className="landing__miniText">Instant % estimate + explanation for a chosen role.</div>
            </div>
            <div className="landing__miniCard">
              <div className="landing__miniTop">
                <span className="landing__miniIcon landing__miniIcon--amber">
                  <IconGap />
                </span>
                <div className="landing__miniTitle">Gap analysis</div>
              </div>
              <div className="landing__miniText">Must-have vs nice-to-have skills, clearly separated.</div>
            </div>
            <div className="landing__miniCard">
              <div className="landing__miniTop">
                <span className="landing__miniIcon landing__miniIcon--blue">
                  <IconPlan />
                </span>
                <div className="landing__miniTitle">Action plan</div>
              </div>
              <div className="landing__miniText">Short, practical steps for the next 2–12 weeks.</div>
            </div>
          </div>
        </section>

        <section className="landing__section">
          <h2 className="landing__h2">What you can do</h2>
          <div className="landing__grid">
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Profile + Goals</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconProfile />
                </span>
              </div>
              <div className="glassCard__text">
                Fill your city, languages, experience, projects, and target profession.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Resume Import (.docx)</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconDoc />
                </span>
              </div>
              <div className="glassCard__text">
                Parse a resume and auto-fill fields. Missing data stays blank, no hard errors.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">AI Chat</div>
                <span className="glassCard__icon glassCard__icon--blue">
                  <IconChat />
                </span>
              </div>
              <div className="glassCard__text">
                Ask for short, factual guidance: what to learn, what to build, what roles match you.
              </div>
            </div>
          </div>
        </section>

        <section className="landing__section landing__section--compact">
          <div className="landing__ctaBar">
            <div>
              <div className="landing__ctaBarTitle">Ready to try it?</div>
              <div className="landing__ctaBarText">
                Create an account and run your first CareerAI analysis.
              </div>
            </div>
            <div className="landing__ctaBarActions">
              <Link className="button button--sm" to="/register">
                Create account
              </Link>
              <Link className="button button--sm button--ghost" to="/faq">
                Read FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
