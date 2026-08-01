import "dotenv/config";
import nodemailer from "nodemailer";

// Gmail + an App Password is the standard "just user/pass" Nodemailer setup
// — matches the two env vars this feature calls for (EMAIL_USER, EMAIL_PASS)
// with nothing extra (host/port/etc.) to configure.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const BRAND_PURPLE = "#7c3aed";

function verificationEmailHtml(verifyUrl) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_PURPLE};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Chitwan Rent</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Verify your listing</h1>

                <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#4b5563;">
                  Thank you for being part of this. You're one of the people who made Chitwan Rent real —
                  by pinning your rent, listing a flat, dropping a seeker pin, or just watching an area.
                  A quick, genuine thank-you. — Ashim (and the AI doing the actual work)
                </p>

                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151;">
                  To keep fake listings off the map, please verify your email within the next 24 hours.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:9999px;background-color:${BRAND_PURPLE};">
                      <a href="${verifyUrl}"
                         style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px;">
                        Verify Listing
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
                  This link expires in 24 hours. After that, you'll need to list your flat again.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  If you didn't create this listing, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Throws on failure — callers decide what "the send failed" should mean for
// the request in flight (see POST /api/flats in routes/flats.js, which logs
// and still responds success rather than failing the listing over this).
export async function sendVerificationEmail({ to, verifyUrl }) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Verify your Chitwan Rent listing",
    html: verificationEmailHtml(verifyUrl),
  });
}

// Same shell as verificationEmailHtml (purple header, same card), minus the
// two things that don't apply to a seeker pin: no verify button (pins need
// no click-through step at all — see routes/seekerPins.js) and no 24h-
// deadline language. No dynamic/user-supplied text is interpolated here, so
// unlike matchEmailHtml below there's nothing that needs escapeHtml.
function seekerConfirmationEmailHtml() {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_PURPLE};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Chitwan Rent</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Your search is live</h1>

                <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#4b5563;">
                  Thank you for being part of this. You're one of the people who made Chitwan Rent real —
                  by pinning your rent, listing a flat, dropping a seeker pin, or just watching an area.
                  A quick, genuine thank-you. — Ashim (and the AI doing the actual work)
                </p>

                <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#374151;">
                  Your search is now active on the map. We'll email you automatically if a compatible flat
                  turns up nearby — no need to keep checking back.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  If you didn't create this search, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Fired once, right after a seeker pin is created (see POST /api/seeker-pins
// in routes/seekerPins.js) — pins need no verification click-through, so
// this is purely a confirmation, not a gate. Same throw-on-failure contract
// as every other send*Email function here; the caller logs and continues
// rather than failing pin creation over a bad send.
export async function sendSeekerConfirmationEmail({ to }) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your search is live on Chitwan Rent",
    html: seekerConfirmationEmailHtml(),
  });
}

function deleteCodeEmailHtml({ flatId, code }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_PURPLE};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Chitwan Rent</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Your listing's delete code</h1>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                  Your flat listing (ID <strong>${flatId}</strong>) is now verified and live. Keep this code —
                  it's the only way to permanently remove this listing later, at
                  <strong>chitwan.rent/deleteflat</strong>.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                  <tr>
                    <td style="border-radius:12px;background-color:#f4f4f7;padding:16px 28px;">
                      <span style="font-size:26px;font-weight:700;letter-spacing:4px;color:#111827;">${code}</span>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
                  <tr>
                    <td style="border-radius:10px;background-color:#fef2f2;border:1px solid #fecaca;padding:12px 16px;">
                      <p style="margin:0;font-size:13px;line-height:1.5;font-weight:600;color:#b91c1c;">
                        For your security, please don't share this ID or code with anyone.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                  Listings can only be deleted once they've been live for 24 hours after verification.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  If you didn't create this listing, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Fired once, right after a listing is verified (see verifyListingByToken in
// lib/verification.js) — never at listing-creation time. Same
// failure-handling contract as sendVerificationEmail: throws, and the caller
// (routes/verifyListing.js) logs-and-continues rather than letting this
// break the verification response, since the listing is already live either
// way by the time this runs.
export async function sendDeleteCodeEmail({ to, flatId, code }) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Chitwan Rent listing's delete code",
    html: deleteCodeEmailHtml({ flatId, code }),
  });
}

// matchName comes from users.name — free text someone typed into the
// optional "Your name" field at sign-in (see AuthGateModal.jsx) — the first
// place this file interpolates user-supplied text into an HTML email, so it
// (and the contact fields, for defense-in-depth) get escaped before going
// into the template.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRs(amount) {
  if (amount === null || amount === undefined) return "Not specified";
  return `Rs. ${Number(amount).toLocaleString("en-IN")}`;
}

const MOVE_IN_LABELS = { asap: "ASAP", next_month: "Next month", flexible: "Flexible" };
function formatMoveIn(value) {
  return MOVE_IN_LABELS[value] ?? "Not specified";
}

const LISTING_TYPE_LABELS = { flat: "Whole flat", flatmate: "Room in a shared flat" };
function formatListingType(value) {
  return LISTING_TYPE_LABELS[value] ?? "Whole flat";
}

const LOOKING_FOR_LABELS = { whole_flat: "Whole flat", room: "Room in a shared flat" };
function formatLookingFor(value) {
  return LOOKING_FOR_LABELS[value] ?? "Flat";
}

function formatBhk(value) {
  return value === null || value === undefined || value === "any" ? "Any BHK" : `${value} BHK`;
}

// Every digest email ends the same way: an optional reply-routing note (see
// DIGEST_REPLY_TO below) and the recipient's own unsubscribe link — shared
// here so sendFlatMatchDigest/sendSeekerMatchDigest don't duplicate it.
function digestFooterHtml(unsubscribeUrl) {
  const replyLine = process.env.DIGEST_REPLY_TO
    ? `<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Reply to this email and it reaches ${escapeHtml(process.env.DIGEST_REPLY_TO)} directly.</p>`
    : "";
  return `
    ${replyLine}
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      This digest repeats weekly as long as your pin/listing stays up. Don't want it anymore?
      <a href="${unsubscribeUrl}" style="color:#7c3aed;">Unsubscribe</a> — this removes your listing from
      Chitwan Rent entirely and stops all future contact sharing, right away.
    </p>`;
}

// One match "card" per compatible pair — shared markup for both digest
// types since both just show type/budget/BHK/move-in plus contact info,
// only the source fields differ.
function matchCardHtml({ typeLabel, budget, bhk, moveIn, email, phone }) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td style="border-radius:12px;background-color:#f4f4f7;padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">${escapeHtml(typeLabel)} &middot; ${escapeHtml(budget)} &middot; ${escapeHtml(bhk)} &middot; Move-in: ${escapeHtml(moveIn)}</p>
          <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">Email</p>
          <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827;">${escapeHtml(email || "Not provided")}</p>
          <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">Phone</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${escapeHtml(phone || "Not provided")}</p>
        </td>
      </tr>
    </table>`;
}

function digestShellHtml({ heading, summaryLine, recapHtml, matchesHtml, unsubscribeUrl }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_PURPLE};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Chitwan Rent</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${escapeHtml(heading)}</h1>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                  ${escapeHtml(summaryLine)} There's no in-app messaging on Chitwan Rent — this weekly email is
                  the only way matches get connected, so reach out directly using the contacts below.
                </p>

                ${recapHtml}
                ${matchesHtml}
                ${digestFooterHtml(unsubscribeUrl)}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  If this doesn't seem relevant to you, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function recapBoxHtml(label, lineHtml) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="border-radius:12px;background-color:#ede9fe;padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#7c3aed;">${escapeHtml(label)}</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${lineHtml}</p>
        </td>
      </tr>
    </table>`;
}

// Sent weekly by the digest job (lib/digestJob.js) to every active flat
// owner, listing every *currently* compatible seeker pin within 2km — the
// full list, recomputed fresh each run, not just new matches since last
// time (see this feature's spec/assumptions writeup for why the old
// one-time sendMatchEmail was replaced with this). Same throw-on-failure
// contract as the other send*Email functions; the caller logs per-recipient
// failures and keeps going.
export async function sendFlatMatchDigest({ to, ownerName, flat, matches, unsubscribeUrl }) {
  const greeting = ownerName ? `Hi ${ownerName}, we` : "We";
  const heading = `We found ${matches.length} ${matches.length === 1 ? "person" : "people"} looking for a flat near yours`;
  const recapHtml = recapBoxHtml(
    "Your listing",
    `${escapeHtml(formatListingType(flat.listing_type))} &middot; ${escapeHtml(formatRs(flat.rent))}/mo &middot; ${escapeHtml(formatBhk(flat.bhk))} &middot; ${escapeHtml(flat.area || "Area not set")}`
  );
  const matchesHtml = matches
    .map(({ seeker }) =>
      matchCardHtml({
        typeLabel: formatLookingFor(seeker.looking_for),
        budget: `Budget ${formatRs(seeker.budget)}/mo`,
        bhk: formatBhk(seeker.bhk_pref),
        moveIn: formatMoveIn(seeker.move_in),
        email: seeker.email,
        phone: seeker.phone,
      })
    )
    .join("");

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    ...(process.env.DIGEST_REPLY_TO ? { replyTo: process.env.DIGEST_REPLY_TO } : {}),
    subject: "This week's compatible seekers near your listing",
    html: digestShellHtml({
      heading,
      summaryLine: `${greeting} found ${matches.length} ${matches.length === 1 ? "person" : "people"} within 2km whose budget, BHK, and preferences line up with your listing.`,
      recapHtml,
      matchesHtml,
      unsubscribeUrl,
    }),
  });
}

// Sent weekly by the digest job to every active seeker pin's submitter,
// listing every currently compatible active flat within 2km. Mirrors
// sendFlatMatchDigest exactly, just with the two sides swapped.
export async function sendSeekerMatchDigest({ to, seekerName, seeker, matches, unsubscribeUrl }) {
  const greeting = seekerName ? `Hi ${seekerName}, we` : "We";
  const heading = `We found ${matches.length} flat${matches.length === 1 ? "" : "s"} that match what you're looking for`;
  const recapHtml = recapBoxHtml(
    "Your search",
    `${escapeHtml(formatLookingFor(seeker.looking_for))} &middot; Budget ${escapeHtml(formatRs(seeker.budget))}/mo &middot; ${escapeHtml(formatBhk(seeker.bhk_pref))} &middot; ${escapeHtml(seeker.area || "Area not set")}`
  );
  const matchesHtml = matches
    .map(({ flat }) =>
      matchCardHtml({
        typeLabel: formatListingType(flat.listing_type),
        budget: `${formatRs(flat.rent)}/mo`,
        bhk: formatBhk(flat.bhk),
        moveIn: formatMoveIn(flat.available_from),
        email: flat.owner_email,
        phone: flat.owner_phone,
      })
    )
    .join("");

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    ...(process.env.DIGEST_REPLY_TO ? { replyTo: process.env.DIGEST_REPLY_TO } : {}),
    subject: "This week's compatible flats near you",
    html: digestShellHtml({
      heading,
      summaryLine: `${greeting} found ${matches.length} flat${matches.length === 1 ? "" : "s"} within 2km whose rent, BHK, and preferences line up with your search.`,
      recapHtml,
      matchesHtml,
      unsubscribeUrl,
    }),
  });
}
