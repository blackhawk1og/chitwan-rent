import { ShieldCheck, FileText } from "lucide-react";
import Modal from "./Modal.jsx";

function P({ children }) {
  return <p className="mt-2 text-sm leading-relaxed text-text-muted">{children}</p>;
}

function H({ children }) {
  return <h3 className="mt-5 text-sm font-bold text-text-primary first:mt-0">{children}</h3>;
}

function Ul({ children }) {
  return <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-muted">{children}</ul>;
}

// Every claim below was checked against this app's actual code before being
// written — not copied from any reference template. Notably: map tiles are
// OpenStreetMap/CARTO/Esri (not Google Maps), there's no IP collection or ad
// network anywhere in the codebase, coordinates are stored/returned at full
// precision (no rounding), and contact fields are technically present in the
// public GET /api/flats and /api/seeker-pins responses even though the app's
// UI never renders them — see the "Who can actually see" section below.
function PrivacyPolicyBody() {
  return (
    <>
      <H>What we collect</H>
      <Ul>
        <li>Browsing the map, searching areas, and viewing flat details: nothing. No account needed.</li>
        <li>
          Listing a flat or dropping a seeker pin: your email and/or phone (used only to sign you in — see "How
          sign-in works" below), plus the listing/preference details you fill in (rent, BHK, furnishing, gated
          society, budget, move-in date, and similar fields).
        </li>
        <li>"I'm interested" on a flat: your name, a contact method, and an optional note.</li>
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
        We do not use Google Maps, Google AdSense, Google Analytics, or any advertising or tracking cookies, and we
        do not collect your IP address.
      </P>

      <H>Who can actually see your contact details</H>
      <P>
        Your email and phone are never displayed in the app's normal interface. The one place we deliberately send
        them onward is the weekly match-digest email — to one compatible seeker or flat owner within 2km of your pin
        (see "How matching works" in our Terms of Use). That said, like most public listing platforms, the map's
        underlying data isn't access-controlled field-by-field, so treat anything you submit as visible to a
        technically determined party, not only to matched users.
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
    </>
  );
}

function TermsOfUseBody() {
  return (
    <>
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
    </>
  );
}

const LEGAL_CONTENT = {
  privacy: { icon: ShieldCheck, title: "Privacy Policy", Body: PrivacyPolicyBody },
  terms: { icon: FileText, title: "Terms of Use", Body: TermsOfUseBody },
};

export default function LegalModal({ type, onClose }) {
  const { icon: Icon, title, Body } = LEGAL_CONTENT[type];

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
          <Icon size={22} />
        </div>
        <h2 className="pr-8 text-lg font-bold text-text-primary">{title}</h2>
      </div>

      <Body />

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light"
      >
        Close
      </button>
    </Modal>
  );
}
