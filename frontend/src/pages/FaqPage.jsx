import { Link } from 'react-router-dom';

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
          <h2 className="staticPage__h2">Is CareerAI only for Kazakhstan?</h2>
          <p className="staticPage__p">
            The knowledge base is designed for Kazakhstan labour market context, so advice is bounded
            to that region.
          </p>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">Can I use Russian?</h2>
          <p className="staticPage__p">
            Yes. The UI is in English, but if you write in Russian in the chat, the AI should answer
            in Russian.
          </p>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">Do I need to fill all profile fields?</h2>
          <p className="staticPage__p">
            No. Missing fields stay blank and the system still works. More data usually improves
            accuracy.
          </p>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">Why is payment manual?</h2>
          <p className="staticPage__p">
            This is an MVP. Manual Kaspi verification makes it possible to ship faster while keeping
            the product usable.
          </p>
        </section>

        <section className="staticPage__section">
          <h2 className="staticPage__h2">What is unlocked with Pro?</h2>
          <p className="staticPage__p">
            Resume import (.docx) and AI Chat. The basic CareerAI analysis is available after sign
            in.
          </p>
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

