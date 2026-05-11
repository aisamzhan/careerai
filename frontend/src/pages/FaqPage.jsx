import { Link } from 'react-router-dom';

function IconInfo(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z"
        fill="currentColor"
      />
      <path d="M11 10h2v7h-2v-7zm0-3h2v2h-2V7z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function IconGlobe(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm7.8 9h-3.2a15.6 15.6 0 00-1.3-6A8.03 8.03 0 0119.8 11zM12 4c.9 1.2 1.7 3.4 2.1 7H9.9C10.3 7.4 11.1 5.2 12 4zM4.2 13h3.2a15.6 15.6 0 001.3 6A8.03 8.03 0 014.2 13zM4.2 11A8.03 8.03 0 018.7 5a15.6 15.6 0 00-1.3 6H4.2zm7.8 9c-.9-1.2-1.7-3.4-2.1-7h4.2c-.4 3.6-1.2 5.8-2.1 7zm3.3-1a15.6 15.6 0 001.3-6h3.2a8.03 8.03 0 01-4.5 6z"
        fill="currentColor"
      />
    </svg>
  );
}

function FaqPage() {
  return (
    <div className="app-page app-page--with-navbar">
      <main className="staticPage">
        <header className="staticPage__header">
          <h1 className="staticPage__title">FAQ</h1>
          <p className="staticPage__lead">
            Quick answers about CareerAI, privacy, languages, and subscriptions.
          </p>
        </header>

        <section className="staticPage__section">
          <div className="faqGrid">
            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Is CareerAI only for Kazakhstan?</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconGlobe />
                </span>
              </div>
              <div className="glassCard__text">
                The knowledge base is designed for Kazakhstan labour market context, so advice is bounded
                to that region.
              </div>
            </div>

            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Can I use Russian?</div>
                <span className="glassCard__icon glassCard__icon--blue">
                  <IconInfo />
                </span>
              </div>
              <div className="glassCard__text">
                Yes. The UI is in English, but if you write in Russian in the chat, the AI should answer
                in Russian.
              </div>
            </div>

            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Do I need to fill all profile fields?</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconInfo />
                </span>
              </div>
              <div className="glassCard__text">
                No. Missing fields stay blank and the system still works. More data usually improves
                accuracy.
              </div>
            </div>

            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">Why is payment manual?</div>
                <span className="glassCard__icon glassCard__icon--amber">
                  <IconInfo />
                </span>
              </div>
              <div className="glassCard__text">
                This is an MVP. Manual Kaspi verification makes it possible to ship faster while keeping
                the product usable.
              </div>
            </div>

            <div className="glassCard">
              <div className="glassCard__top">
                <div className="glassCard__title">What is unlocked with Pro?</div>
                <span className="glassCard__icon glassCard__icon--teal">
                  <IconInfo />
                </span>
              </div>
              <div className="glassCard__text">
                Resume import (.docx) and AI Chat. The basic CareerAI analysis is available after sign
                in.
              </div>
            </div>
          </div>
        </section>

        <section className="staticPage__section staticPage__section--cta">
          <div className="landing__ctaBar">
            <div>
              <div className="landing__ctaBarTitle">Want to try it?</div>
              <div className="landing__ctaBarText">
                Create an account and run your first analysis.
              </div>
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

export default FaqPage;
