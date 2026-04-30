import { Link } from 'react-router-dom';

const KASPI_RECIPIENT = '4400430346149914';

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
              <div className="glassCard__title">1. Pay to this Kaspi account</div>
              <div className="glassCard__text">
                Transfer 990 KZT to: <span className="mono">{KASPI_RECIPIENT}</span>
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">2. Submit proof in the app</div>
              <div className="glassCard__text">
                In the dashboard, start Resume Import or AI Chat and the Subscription panel will
                appear. Provide your payer account, transaction ID, and attach a receipt screenshot.
              </div>
            </div>
            <div className="glassCard">
              <div className="glassCard__title">3. Admin approves</div>
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

