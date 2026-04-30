import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

function LandingPage() {
  const navigate = useNavigate();

  const isAuthed = useMemo(() => Boolean(localStorage.getItem('authToken')), []);

  return (
    <div className="app-page app-page--with-navbar">
      <main className="landing" aria-label="CareerAI overview">
        <section className="landing__hero">
          <div className="landing__heroLeft">
            <div className="landing__badge">Built for Kazakhstan job market</div>
            <h1 className="landing__title">CareerAI</h1>
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
              <div className="landing__miniTitle">Career fit</div>
              <div className="landing__miniText">Instant % estimate + explanation for a chosen role.</div>
            </div>
            <div className="landing__miniCard">
              <div className="landing__miniTitle">Gap analysis</div>
              <div className="landing__miniText">Must-have vs nice-to-have skills, clearly separated.</div>
            </div>
            <div className="landing__miniCard">
              <div className="landing__miniTitle">Action plan</div>
              <div className="landing__miniText">Short, practical steps for the next 2–12 weeks.</div>
            </div>
          </div>
        </section>

        <section className="landing__section">
          <h2 className="landing__h2">What you can do</h2>
          <div className="landing__grid">
            <div className="glassCard">
              <div className="glassCard__title">Profile + Goals</div>
              <div className="glassCard__text">
                Fill your city, languages, experience, projects, and target profession.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">Resume Import (.docx)</div>
              <div className="glassCard__text">
                Parse a resume and auto-fill fields. Missing data stays blank, no hard errors.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">AI Chat</div>
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

