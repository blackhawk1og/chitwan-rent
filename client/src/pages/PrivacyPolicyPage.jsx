import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

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
        <Link to="/" className="text-base font-extrabold text-accent-purple-light transition hover:opacity-80">
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

function Ul({ children }) {
  return (
    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-muted sm:text-base">
      {children}
    </ul>
  );
}

// Standalone route (not a modal) — same page shell as DeleteFlatPage.jsx /
// AboutPage.jsx. Content below is verbatim from LegalModal.jsx's Privacy
// Policy body. LegalModal.jsx is still in active use elsewhere (the landing
// card's own Privacy Policy / Terms of Use links deliberately still open it)
// — only /about's links point here instead. Keep both copies in sync if the
// text ever changes.
//
// Every claim was checked against this app's actual code before being
// written — not copied from any reference template. Notably: map tiles are
// OpenStreetMap/CARTO/Esri (not Google Maps), there's no IP collection or ad
// network anywhere in the codebase, coordinates are stored/returned at full
// precision (no rounding), and contact fields are technically present in the
// public GET /api/flats and /api/seeker-pins responses even though the app's
// UI never renders them — see the "Who can actually see" section below.
export default function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-screen w-full bg-bg font-light"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <NavBar />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple-light">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Privacy Policy</h1>
        </div>

        <H>What we collect</H>
        <Ul>
          <li>Browsing the map, searching areas, and viewing flat details: nothing. No account needed.</li>
          <li>
            Listing a flat or dropping a seeker pin: your email and/or phone (used only to sign you in — see "How
            sign-in works" below), plus the listing/preference details you fill in (rent, BHK, furnishing, gated
            society, budget, move-in date, and similar fields). Rent is automatically checked against a typical
            range for the flat's BHK; if it's unusually high, listing still goes through but the flat is flagged
            and excluded from weekly matching — see "Rent-cap flagging" in our Terms of Use.
          </li>
          <li>
            "I'm interested" on a flat: your email and phone (used to sign you in — see "How sign-in works" below),
            plus whatever optional details you add — a note, move-in timeline, gender, and parking needs (including
            number of spots, if given).
          </li>
          <li>Comments on a flat's detail panel: shown publicly under the name tied to your account.</li>
          <li>
            Reporting a listing: an optional written reason. We never show your identity to the listing's owner or
            anyone else — only the reasons themselves, and only if the listing is later removed.
          </li>
          <li>
            "What rent are you paying?": fully anonymous. No account, name, or contact info is attached — just a
            location and the numbers you enter.
          </li>
          <li>
            Spotting a To-Let board: a photo, an optional nickname, an optional message, and the pin's location. Your
            chosen nickname (never your real name) and a points count appear publicly on the Superheroes leaderboard.
          </li>
        </Ul>

        <H>How sign-in works</H>
        <P>
          There's no password and no OTP. Signing in links your submissions to an email and/or phone number you give
          us, so we can send you things like listing verification and match emails. We treat access to that email/phone
          as proof of "you" — we don't verify identity beyond that.
        </P>

        <H>Location data</H>
        <P>
          Pins and rent reports store the exact coordinates you drop or your device reports — we don't round or blur
          them. We only accept locations inside Chitwan district.
        </P>

        <H>Third-party services we use</H>
        <Ul>
          <li>Map tiles and labels: OpenStreetMap and CARTO.</li>
          <li>Satellite view: Esri, Maxar, and Earthstar Geographics.</li>
          <li>
            Turning a dropped pin into an area name: OpenStreetMap's Nominatim service — your pin's coordinates are
            sent to Nominatim for this lookup.
          </li>
          <li>Sending email: Gmail, via our own chitwanrent@gmail.com account.</li>
        </Ul>
        <P>
          We do not use Google Maps, Google AdSense, Google Analytics, or any advertising or tracking cookies. We
          don't collect your IP address anywhere in the public app — the only IP logging anywhere in our systems is
          on our own internal operator tool's login page (not user-facing), purely to block repeated password
          guesses.
        </P>

        <H>Who can actually see your contact details</H>
        <P>
          Your email and phone are never displayed in the app's normal interface. We deliberately send them onward
          in two cases: the weekly match-digest email (to one compatible seeker or flat owner within 2km of your pin
          — see "How matching works" in our Terms of Use), and, separately, if you tap "I'm interested" on a flat —
          your contact details go straight to that flat's owner by email, regardless of distance or match
          compatibility. That said, like most public listing platforms, the map's underlying data isn't
          access-controlled field-by-field, so treat anything you submit as visible to a technically determined
          party, not only to matched users.
        </P>

        <H>Photos</H>
        <P>
          Photos you submit are stored directly in our own database — we don't upload them to a third-party image
          host.
        </P>

        <H>How long we keep things</H>
        <Ul>
          <li>
            An unverified flat listing (you never clicked the link in your verification email) is deleted automatically
            24 hours after you submit it.
          </li>
          <li>
            A verified listing stays up until you delete it yourself (see "Deleting a listing" below) or it collects 3
            reports, at which point it's automatically pulled from every view and we email you why.
          </li>
          <li>
            A seeker pin has no automatic expiry — it stays active until you archive it (offered the next time you drop
            a new pin).
          </li>
          <li>Rent reports aren't tied to anyone, so there's nothing to delete on request beyond the entry itself.</li>
        </Ul>

        <H>Deleting a listing</H>
        <P>
          Listing a flat gets you a 10-digit code by email. Starting 24 hours after you verify the listing, that code
          lets you delete it yourself — no login needed, just the flat and the code. Repeated wrong attempts are
          rate-limited.
        </P>

        <H>Emails we send</H>
        <P>
          Listing verification, weekly match digests, report-removal notices, and to-let/superhero confirmations. Every
          digest email includes its own one-click unsubscribe link, specific to that listing or pin. If you don't see
          an email from us, check your spam folder — automated mail from a new sender sometimes lands there.
        </P>

        <H>Contact</H>
        <P>
          Questions, data requests, or takedowns:{" "}
          <a href="mailto:chitwanrent@gmail.com" className="font-semibold text-accent-purple-light hover:underline">
            chitwanrent@gmail.com
          </a>
          .
        </P>
      </div>
    </div>
  );
}
