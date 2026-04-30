import { Link } from 'react-router-dom';

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
              <div className="glassCard__title">Profile</div>
              <div className="glassCard__text">City, languages, experience months, projects.</div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">Skills</div>
              <div className="glassCard__text">
                Technical, tools, and soft skills. You can type in any language.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">Goals</div>
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
              <div className="glassCard__title">Strengths</div>
              <div className="glassCard__text">
                Skills and signals that match must-have requirements for the role.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">Gaps</div>
              <div className="glassCard__text">
                Missing must-haves first, then nice-to-haves (so you know what matters most).
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">Fit score</div>
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
              <div className="glassCard__title">Next steps</div>
              <div className="glassCard__text">
                A short plan: what to learn, what to build, and what to apply for.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">AI Chat</div>
              <div className="glassCard__text">
                Ask follow-ups: portfolio ideas, interview prep, or “what should I improve first?”.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">Local context</div>
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

