import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const NAV_LINKS = [
  { label: "Map", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/termofuse" },
];

// Same nav markup as AboutPage.jsx/ContactPage.jsx, duplicated rather than
// shared — see those files for why (no shared header component exists yet).
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

function P({ children }) {
  return <p className="mt-2 text-sm leading-relaxed text-text-muted sm:text-base">{children}</p>;
}

function H({ children }) {
  return <h3 className="mt-8 text-lg font-bold text-text-primary first:mt-0 sm:text-xl">{children}</h3>;
}

// Standalone route (not a modal) — same page shell as DeleteFlatPage.jsx /
// AboutPage.jsx. Content below is verbatim from LegalModal.jsx's Terms of
// Use body. LegalModal.jsx is still in active use elsewhere (the landing
// card's own Privacy Policy / Terms of Use links deliberately still open it)
// — only /about's links point here instead. Keep both copies in sync if the
// text ever changes.
export default function TermsOfUsePage() {
  return (
    <div
      className="min-h-screen w-full bg-bg font-light"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <NavBar />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple-light">
            <FileText size={22} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Terms of Use</h1>
        </div>

        <H>Your content is your responsibility</H>
        <P>
          Anything you submit — a listing, a seeker pin, a comment, a rent report, a to-let photo — must be accurate
          and yours to share. Don't post anyone else's contact information without their consent, don't post something
          you don't have rights to, and don't use the platform to harass, discriminate, or scam. We can remove content
          that violates this without notice.
        </P>

        <H>How matching works</H>
        <P>
          If you list a flat or drop a seeker pin with an email or phone, we look for compatible pins on the other side
          within a 2km radius. "Compatible" means the same listing type (whole flat vs. a room), the seeker's BHK
          preference (if any), and the seeker's budget covering the flat's rent; room listings are also matched on
          gender preference, food preference, and smoking preference where either side has stated one. If we find a
          match, both sides hear about it in a weekly digest email — never on the map, and never as an unsolicited push
          beyond that email. You can unsubscribe a specific listing or pin at any time via the link in its digest
          email.
        </P>

        <H>Reporting and removal</H>
        <P>
          Any listing can be flagged. At 3 reports, it's automatically removed from every view on the map, and we'll
          email the owner an explanation — including the reasons given, but never who gave them.
        </P>

        <H>Rent-cap flagging</H>
        <P>
          Flats above a fixed rent ceiling for their BHK (₹15,000 for 1BHK, ₹30,000 for 2BHK, ₹45,000 for 3BHK, ₹60,000
          for 4BHK, ₹100,000 for 5BHK+) trigger a warning when you list them. Up to double that ceiling, you can confirm
          and proceed — the listing stays fully visible on the map but is excluded from weekly matching. Above double
          the ceiling, we don't accept the listing at all; you'll need to lower the rent to continue.
        </P>

        <H>Deleting your listing</H>
        <P>
          You're in control of your own flat listing via the 10-digit code emailed to you at verification — see our
          Privacy Policy for exactly how and when it works. We don't delete listings on your behalf without it, except
          for the automatic cases described there (never verified, or too many reports).
        </P>

        <H>The 24-hour rule</H>
        <P>
          You can only submit one new flat listing every 24 hours, counted from your last attempt — regardless of
          whether that listing was verified, is still pending, or was later removed.
        </P>

        <H>No warranty</H>
        <P>
          Chitwan Rent is provided "as is." We don't guarantee uptime, that any listing is accurate or still available,
          or that using the app will result in you finding or renting out a flat.
        </P>

        <H>Limitation of liability</H>
        <P>
          We're not liable for any dispute, loss, or damage arising from a listing, a match, or any interaction between
          users — including inaccurate rent, unavailable flats, or misrepresented preferences. You're responsible for
          verifying anything important yourself before acting on it.
        </P>

        <H>Changes</H>
        <P>We may update these terms or the app's features as we grow. Continued use after a change means you accept it.</P>

        <H>Contact</H>
        <P>
          Questions about these terms:{" "}
          <a href="mailto:chitwanrent@gmail.com" className="font-semibold text-accent-purple-light hover:underline">
            chitwanrent@gmail.com
          </a>
          .
        </P>
      </div>
    </div>
  );
}
