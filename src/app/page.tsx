import Link from "next/link";

const coreFeatures = [
  {
    title: "Deadline Radar",
    description: "Province-aware reminders for permit expiry, biometrics, and key milestones.",
    icon: "⏱",
  },
  {
    title: "Study + PGWP Checklists",
    description: "Step-by-step guidance pages for study permit and PGWP planning.",
    icon: "✅",
  },
  {
    title: "CRS + Path Planner",
    description: "Track score readiness, profile strength, and next best preparation step.",
    icon: "🧮",
  },
  {
    title: "Document Vault",
    description: "Store confirmations, forms, and receipts in one secure timeline view.",
    icon: "🗂",
  },
  {
    title: "Risk Monitor",
    description: "Spot weak points early using status, expiry, and readiness signals.",
    icon: "🧠",
  },
  {
    title: "Smart Notifications",
    description: "Get notified before key due dates so important actions are not missed.",
    icon: "🔔",
  },
];

const testimonials = [
  {
    quote: "I stopped missing deadlines because everything finally sits in one place.",
    name: "Aman S.",
    role: "International Student, Ontario",
  },
  {
    quote: "The Canada-specific reminders are the difference. It feels local, not generic.",
    name: "Camila R.",
    role: "PGWP Applicant, Alberta",
  },
  {
    quote: "The vault and checklist flow makes status tracking much less stressful.",
    name: "Jean M.",
    role: "Newcomer Worker, Quebec",
  },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <div className="landing-shell">
        <header className="landing-topbar landing-animate-in">
          <div className="landing-brand">
            <div className="landing-brand-mark" aria-hidden>
              ✈
            </div>
            <div>
              <p className="landing-brand-name">PaperPath</p>
              <p className="landing-brand-sub">Made for life in Canada</p>
            </div>
          </div>

          <div className="landing-actions">
            <Link href="/login" className="btn btn-secondary">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </header>

        <section className="landing-hero landing-animate-in delay-1">
          <p className="landing-pill">Canada-first planning platform</p>
          <h1 className="landing-title">
            Professional immigration organization,
            <span>without the chaos.</span>
          </h1>
          <p className="landing-subtitle">
            Track deadlines, documents, reminders, and next actions in a clean workflow built for students and
            newcomers in Canada.
          </p>
          <div className="landing-hero-actions">
            <Link href="/signup" className="btn btn-primary">
              Start Free Today
            </Link>
            <Link href="/terms" className="btn btn-secondary">
              How It Works
            </Link>
          </div>
          <p className="landing-caption">Free plan available • No card required • Not legal advice</p>
        </section>

        <section className="landing-stats landing-animate-in delay-2" aria-label="platform highlights">
          <article className="landing-stat-card">
            <p className="landing-stat-value">120/90/60/30</p>
            <p className="landing-stat-label">Checkpoint reminder system</p>
          </article>
          <article className="landing-stat-card">
            <p className="landing-stat-value">Study + PGWP</p>
            <p className="landing-stat-label">Built-in checklist pages</p>
          </article>
          <article className="landing-stat-card">
            <p className="landing-stat-value">CAD</p>
            <p className="landing-stat-label">Transparent local pricing</p>
          </article>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">Features Canadians Ask For</p>
            <h2>Everything you need to stay organized</h2>
          </div>
          <div className="landing-feature-grid">
            {coreFeatures.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <p className="landing-feature-icon" aria-hidden>
                  {feature.icon}
                </p>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">Simple Pricing</p>
            <h2>Start free, upgrade when you need more</h2>
          </div>

          <div className="landing-pricing-grid">
            <article className="landing-price-card">
              <div className="landing-price-head">
                <h3>Free</h3>
                <p>$0</p>
              </div>
              <ul className="landing-price-list">
                <li>Guides preview and official links</li>
                <li>Basic reminder tracking</li>
                <li>CRS planning tools</li>
              </ul>
            </article>

            <article className="landing-price-card featured">
              <div className="landing-price-head">
                <h3>
                  Pro <span>Most popular</span>
                </h3>
                <p>$6.99 CAD/mo</p>
              </div>
              <ul className="landing-price-list">
                <li>Advanced reminders + timeline view</li>
                <li>Secure document vault</li>
                <li>Risk monitoring and premium tools</li>
              </ul>
              <Link href="/signup" className="btn btn-primary">
                Try 7 Days Free
              </Link>
            </article>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">Trusted By Newcomers</p>
            <h2>Built to reduce stress and missed steps</h2>
          </div>
          <div className="landing-testimonial-grid">
            {testimonials.map((item) => (
              <article key={item.name} className="landing-testimonial-card">
                <p className="landing-stars" aria-label="5 stars">
                  ★★★★★
                </p>
                <p className="landing-quote">“{item.quote}”</p>
                <p className="landing-person">{item.name}</p>
                <p className="landing-role">{item.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <h2>Ready to organize your Canadian journey?</h2>
          <p>Use one workspace for reminders, documents, checklists, and next actions.</p>
          <div className="landing-hero-actions">
            <Link href="/signup" className="btn btn-primary">
              Create Free Account
            </Link>
            <Link href="/contact" className="btn btn-secondary">
              Contact Team
            </Link>
          </div>
        </section>

        <footer className="landing-footer">
          <p>PaperPath Technologies provides organizational tools only. Not legal or immigration advice.</p>
          <div className="footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <p>Always confirm requirements on official canada.ca sources.</p>
        </footer>
      </div>
    </main>
  );
}
