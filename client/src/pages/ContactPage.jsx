import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Map", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/termofuse" },
];

// Same nav/footer/section markup as AboutPage.jsx, duplicated rather than
// shared — there's no shared header/nav/footer component anywhere else in
// this app (every standalone page is self-contained), so this keeps that
// existing convention instead of introducing a new shared component.
function NavBar() {
  return (
    <nav className="border-b border-white/10">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 sm:px-10">
        <Link to="/" className="flex items-center gap-2 text-base font-extrabold text-accent-purple-light transition hover:opacity-80">
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
      <h2 className="text-lg font-bold text-text-primary sm:text-xl">{heading}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-muted sm:text-base">{children}</div>
    </section>
  );
}

// Small uppercase label + larger linked value — same convention as
// FlatDetailPanel.jsx's "Monthly Rent" block, wrapped in the bordered
// rounded box style already used elsewhere (e.g. LandingCard.jsx's
// "Spotted a To-Let board?" strip).
function InfoCard({ label, value, href, external }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-alt px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</div>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="mt-1 block text-lg font-bold text-accent-purple-light hover:underline"
      >
        {value}
      </a>
    </div>
  );
}

// Standalone route (not a modal). Content is factual/neutral throughout,
// matching AboutPage.jsx's tone.
export default function ContactPage() {
  return (
    <div
      className="min-h-screen w-full bg-bg font-light"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <NavBar />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="text-2xl font-extrabold leading-tight text-text-primary sm:text-3xl">Contact</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
          Direct ways to reach, the builder of Chitwan Rent.
        </p>

        <Section heading="Email">
          <p>For feedback, listing issues, data deletion requests, or anything else:</p>
          <InfoCard label="Email" value="chitwanrent@gmail.com" href="mailto:chitwanrent@gmail.com" />
          <p>Replies typically within 24 hours.</p>
        </Section>

        <Section heading="LinkedIn">
          <p>Best for networking, professional inquiries, or saying hello.</p>
          <InfoCard
            label="LinkedIn"
            value="Ashim Ranabhat"
            href="https://www.linkedin.com/in/ashim-ranabhat/"
            external
          />
        </Section>

        <Section heading="Privacy / data deletion requests">
          <p>
            If you want your data removed from Chitwan Rent — a seeker pin, a flat listing, or a rent report you
            submitted — email{" "}
            <a href="mailto:chitwanrent@gmail.com" className="font-semibold text-accent-purple-light hover:underline">
              chitwanrent@gmail.com
            </a>
            .
          </p>
          <p>
            We respond to all data deletion requests within 24–48 hours. See the{" "}
            <Link to="/privacy" className="font-semibold text-accent-purple-light hover:underline">
              Privacy Policy
            </Link>{" "}
            for full details on what we collect, how we use it, and your rights.
          </p>
        </Section>

        <Section heading="What's NOT a good channel">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-text-primary">Listings on individual flats</span> — owners reach
              seekers automatically through the weekly match digest. Don't email to add a listing; use "List my
              flat" on the map.
            </li>
            <li>
              <span className="font-semibold text-text-primary">Generic real-estate help</span> — Chitwan Rent
              doesn't broker, advise, or shortlist. The site is the data. Use the pins.
            </li>
            <li>
              <span className="font-semibold text-text-primary">Areas outside Chitwan district</span> — we're
              Chitwan-focused. See{" "}
              <Link to="/about" className="font-semibold text-accent-purple-light hover:underline">
                About
              </Link>{" "}
              for why.
            </li>
          </ul>
        </Section>
      </div>

      <Footer />
    </div>
  );
}
