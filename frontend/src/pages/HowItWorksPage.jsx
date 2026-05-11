import { Link } from 'react-router-dom';

function IconStep(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z"
        fill="currentColor"
      />
      <path d="M11 7h2v10h-2V7zm-4 5h10v2H7v-2z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function IconFit(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z"
        fill="currentColor"
      />
      <path d="M12 6a6 6 0 106 6 6.01 6.01 0 00-6-6zm0 8a2 2 0 112-2 2 2 0 01-2 2z" fill="currentColor" opacity="0.85" />
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

function HowItWorksPage() {
  return (
    <div className="app-page app-page--with-navbar">
      <main className="staticPage">
        <header className="staticPage__header">
          <h1 className="staticPage__title">How CareerAI Works</h1>
          <p className="staticPage__lead">
            CareerAI turns your profile and resume into a practical, role-focused plan using a
            Kazakhstan-specific knowledge base.
          </p>
        </header>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">1. You provide data</h2>
          <div className="staticPage__cardGrid">
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Profile</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconStep />
                </span>
              </div>
              <div className="glassCard__text">City, languages, experience months, projects.</div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Skills</div>
                <span className="glassCard__icon glassCard__icon--blue">
                  <IconStep />
                </span>
              </div>
              <div className="glassCard__text">
                Technical, tools, and soft skills. You can type in any language.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Goals</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconStep />
                </span>
              </div>
              <div className="glassCard__text">
                Choose a target profession. CareerAI compares you against that role’s requirements.
              </div>
            </div>
          </div>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">2. CareerAI assesses fit</h2>
          <div className="staticPage__cardGrid">
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Strengths</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconFit />
                </span>
              </div>
              <div className="glassCard__text">
                Skills and signals that match must-have requirements for the role.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Gaps</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconFit />
                </span>
              </div>
              <div className="glassCard__text">
                Missing must-haves first, then nice-to-haves (so you know what matters most).
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Fit score</div>
                <span className="glassCard__icon glassCard__icon--blue">
                  <IconFit />
                </span>
              </div>
              <div className="glassCard__text">
                A simple % estimate and a short explanation based on your inputs.
              </div>
            </div>
          </div>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">3. You get actionable advice</h2>
          <div className="staticPage__cardGrid">
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Next steps</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconStep />
                </span>
              </div>
              <div className="glassCard__text">
                A short plan: what to learn, what to build, and what to apply for.
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
                Ask follow-ups: portfolio ideas, interview prep, or “what should I improve first?”.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Local context</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconFit />
                </span>
              </div>
              <div className="glassCard__text">
                Recommendations are bounded to Kazakhstan labour market information.
              </div>
            </div>
          </div>
        </section>

        <section className="staticPage__section staticPage__section--cta">
          <div className="landing__ctaBar">
            <div>
              <div className="landing__ctaBarTitle">Start your analysis</div>
              <div className="landing__ctaBarText">Create an account and open your dashboard.</div>
            </div>
            <div className="landing__ctaBarActions">
              <Link className="button button--sm" to="/register">
                Create account
              </Link>
              <Link className="button button--sm button--ghost" to="/pricing">
                Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HowItWorksPage;
