import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Map", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/termofuse" },
];

// No shared header/nav/footer component exists elsewhere in this app yet
// (every other page — DeleteFlatPage, ContactPage, Privacy/TermsOfUsePage —
// uses its own plain "Back to map" link instead). Built directly here using
// the app's existing color tokens for visual consistency; not extracted into
// a shared component since nothing else needs a persistent nav bar yet.
function NavBar() {
  return (
    <nav className="border-b border-white/10">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 sm:px-10">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-extrabold text-accent-purple-light transition hover:opacity-80"
        >
          <img src="/ctwnlogo.webp" alt="" className="h-7 w-7 rounded-lg object-cover" />
          Chitwan Rent
        </Link>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-semibold text-text-primary transition hover:opacity-70"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-text-muted sm:px-8">
      &copy; {new Date().getFullYear()} Chitwan Rent
    </footer>
  );
}

function Section({ heading, children }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-lg font-bold text-text-primary sm:text-xl">
        {heading}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-muted sm:text-base">
        {children}
      </div>
    </section>
  );
}

const PLATFORM_STEPS = [
  {
    title: "Renters share what they pay",
    body: 'Anonymous "pin your rent" reports — no name attached, just a location and a number — build a real map of actual rents across Chitwan, as an honest counterweight to inflated asking prices.',
  },
  {
    title: "Owners list flats directly",
    body: "Drop a pin, enter flat details, verify by email. Zero broker fees, zero listing fees, zero commission. Listings are rate-limited and can be removed anytime with an emailed delete code.",
  },
  {
    title: "Flat-hunters drop a seeker pin",
    body: "Tell us your budget, area, and preferences. A weekly digest email connects seekers and owners within range automatically — no agents, no middlemen.",
  },
  {
    title: "Spot a To-Let",
    body: 'A gamified layer where anyone can photograph and pin "to-let" boards they spot around town, crowdsourcing listings that haven\'t been added yet.',
  },
];

// Standalone route (not a modal). Content is factual/neutral throughout, not
// the first-person voice used in this app's notification emails.
export default function AboutPage() {
  return (
    <div
      className="min-h-screen w-full bg-bg font-light"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <NavBar />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="text-2xl font-extrabold leading-tight text-text-primary sm:text-3xl">
          About Chitwan Rent
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
          An anonymous, crowdsourced rent map for Chitwan district, Nepal. Real
          prices from real renters. No brokers. No paywall. Free forever.
        </p>

        <Section heading="Why this exists">
          <p>
            Most rental listings people see are broker-quoted or landlord-set
            asking prices — not what tenants actually pay. There's no public
            source of truth for "what does this flat actually cost in this
            area?"
          </p>
          <p>
            Chitwan Rent flips that. Renters drop pins showing what they
            actually pay. Every verified rent becomes the next renter's
            reference point. No broker layer, no commercial gate — just
            transparent data shared by the people who live here.
          </p>
        </Section>

        <Section heading="How the platform works">
          <ol className="space-y-6">
            {PLATFORM_STEPS.map((step, i) => (
              <li key={step.title} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-purple text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-text-primary">
                    {step.title}
                  </p>
                  <p className="mt-1">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section heading="The tech (transparency)">
          <p>
            Chitwan Rent is built and maintained by Ashim, with help from
            Claude, an AI coding assistant from Anthropic, used throughout
            development.
          </p>
          <p>
            Stack: React + Vite + Tailwind + react-leaflet on the frontend,
            Express + PostgreSQL on the backend. No mobile app, no unnecessary
            frameworks — the simplest approach that works.
          </p>
        </Section>

        <Section heading="Mission, in one line">
          <p className="text-lg font-semibold text-text-primary">
            Make Chitwan's rental data as transparent as it should be.
          </p>
        </Section>

        <p className="mt-16 text-sm italic leading-relaxed text-text-muted">
          Shout-out to{" "}
          <a
            href="https://bengaluru.rent/"
            target="_blank"
            rel="noopener noreferrer"
            className="not-italic text-accent-purple-light hover:underline"
          >
            bengaluru.rent
          </a>{" "}
          — their map-first, brokerage-free approach to rental transparency
          inspired a lot of how Chitwan Rent works. Full credit to them for the
          original concept.
        </p>
      </div>

      <Footer />
    </div>
  );
}
