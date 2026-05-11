import { Link } from 'react-router-dom';

const KASPI_RECIPIENT = '4400430346149914';

function IconShield(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z"
        fill="currentColor"
      />
      <path d="M10.7 13.9l-2.1-2.1-1.4 1.4 3.5 3.5 6.1-6.1-1.4-1.4-4.7 4.7z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function IconWallet(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M3 7a3 3 0 013-3h12a2 2 0 012 2v2H6a3 3 0 00-3 3V7zm0 6a3 3 0 013-3h15v8a3 3 0 01-3 3H6a3 3 0 01-3-3v-5z"
        fill="currentColor"
      />
      <path d="M16 14h4v2h-4v-2z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function PricingPage() {
  return (
    <div className="app-page app-page--with-navbar">
      <main className="staticPage">
        <header className="staticPage__header">
          <h1 className="staticPage__title">Pricing</h1>
          <p className="staticPage__lead">
            CareerAI uses a simple MVP subscription model. Payment is manual via Kaspi and approved by
            an admin.
          </p>
        </header>

        <section className="staticPage__section">
          <div className="pricingCard">
            <div>
              <div className="pricingCard__plan">Pro Access</div>
              <div className="pricingCard__price">
                990 KZT <span className="pricingCard__period">/ 30 days</span>
              </div>
              <div className="pricingCard__desc">Unlock Resume import (.docx) and AI Chat.</div>
            </div>
            <div className="pricingCard__bullets">
              <div className="pricingCard__bullet">Resume parsing and auto-fill</div>
              <div className="pricingCard__bullet">CareerAI chat for follow-up questions</div>
              <div className="pricingCard__bullet">Admin approval to prevent fraud</div>
            </div>
          </div>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">How payment works (Kaspi)</h2>
          <div className="staticPage__cardGrid">
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">1. Pay to this Kaspi account</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconWallet />
                </span>
              </div>
              <div className="glassCard__text">
                Transfer 990 KZT to: <span className="mono">{KASPI_RECIPIENT}</span>
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">2. Submit proof in the app</div>
                <span className="glassCard__icon glassCard__icon--blue">
                  <IconShield />
                </span>
              </div>
              <div className="glassCard__text">
                In the dashboard, start Resume Import or AI Chat and the Subscription panel will
                appear. Provide your payer account, transaction ID, and attach a receipt screenshot.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">3. Admin approves</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconShield />
                </span>
              </div>
              <div className="glassCard__text">
                After approval, Pro access is active for 30 days from the approval date.
              </div>
            </div>
          </div>
        </section>

        <section className="staticPage__section staticPage__section--cta">
          <div className="landing__ctaBar">
            <div>
              <div className="landing__ctaBarTitle">Ready to start?</div>
              <div className="landing__ctaBarText">Create an account and open your dashboard.</div>
            </div>
            <div className="landing__ctaBarActions">
              <Link className="button button--sm" to="/register">
                Create account
              </Link>
              <Link className="button button--sm button--ghost" to="/faq">
                FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PricingPage;
