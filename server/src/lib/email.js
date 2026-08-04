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
                  it's what you'll need to mark it as rented or remove it later, at
                  <strong>chitwan.rent/flatstatus</strong>.
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

function reportRemovalReasonsHtml(reasons) {
  if (!reasons || reasons.length === 0) return "";
  const items = reasons.map((r) => `<li style="margin:0 0 4px;">${escapeHtml(r)}</li>`).join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="border-radius:10px;background-color:#f4f4f7;padding:14px 18px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Reasons given</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#374151;">${items}</ul>
        </td>
      </tr>
    </table>`;
}

// reasons is every non-null flat_reports.reason for this flat, oldest first
// — never the reporter's identity (user_id is intentionally not selected by
// the caller). Falls back to just stating the count when no report included
// a reason (reason is optional at submission time — see ReportReasonModal.jsx).
function reportRemovalEmailHtml({ flatId, reportCount, reasons }) {
  const hasReasons = reasons && reasons.length > 0;
  const summaryLine = hasReasons
    ? "Here's what people reported:"
    : `It received ${reportCount} report${reportCount === 1 ? "" : "s"}, which crossed our removal threshold — no specific reasons were given.`;

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
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Your listing was removed</h1>

                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
                  Your flat listing (ID <strong>${flatId}</strong>) has been taken off the Chitwan Rent map.
                  Other users flagged it enough times to cross our automatic removal threshold
                  (${reportCount} report${reportCount === 1 ? "" : "s"}).
                </p>

                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#4b5563;">${escapeHtml(summaryLine)}</p>

                ${reportRemovalReasonsHtml(reasons)}

                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  You're welcome to list again — the usual 24-hour limit between listings still applies,
                  the same as for any new listing.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  This is an automated notice — no action is needed unless you'd like to list again.
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

// Fired once, right when a report pushes a flat's report_count to the
// removal threshold (see POST /:id/report in routes/flats.js) — never again
// on later reports, since the flat is already off the map by then. Same
// throw-on-failure, log-and-continue contract as every other send*Email
// function here.
export async function sendReportRemovalEmail({ to, flatId, reportCount, reasons }) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Chitwan Rent listing was removed",
    html: reportRemovalEmailHtml({ flatId, reportCount, reasons }),
  });
}

// gender here is InterestForm.jsx's own "You are" field — same vocabulary
// as seeker_pins.gender, not flats.flatmate_gender_pref (a preference for
// others, not an identity) — see that form's comments for the distinction.
const INTEREST_GENDER_LABELS = { male: "Male", female: "Female", other: "Other" };

// formatMoveIn is defined further down this file — safe to call here despite
// the earlier position: `function` declarations are hoisted module-wide in
// JS, so call-site order doesn't matter, only that both live in this module.
function interestDetailRowsHtml({ moveIn, gender, parkingRequired, parkingCount, note }) {
  const rows = [];
  if (moveIn) {
    rows.push(`<p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong>Move-in:</strong> ${escapeHtml(formatMoveIn(moveIn))}</p>`);
  }
  if (gender && INTEREST_GENDER_LABELS[gender]) {
    rows.push(`<p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong>They are:</strong> ${escapeHtml(INTEREST_GENDER_LABELS[gender])}</p>`);
  }
  // Only stated when explicitly true — parkingRequired can be false
  // ("No preference" selected) or null (never touched); neither is worth a
  // line in the email, same as every other optional field here being
  // omitted rather than shown as "Not specified". parkingCount only ever
  // has a real value alongside parkingRequired === true (see routes/
  // flats.js's own parkingCountNum guard), so it's fine to check it alone.
  if (parkingRequired === true) {
    const spotsLabel = Number.isFinite(parkingCount) ? ` (${parkingCount} spot${parkingCount === 1 ? "" : "s"})` : "";
    rows.push(`<p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong>Parking:</strong> Required${spotsLabel}</p>`);
  }
  if (note) {
    rows.push(`<p style="margin:0;font-size:13px;color:#374151;"><strong>Note:</strong> ${escapeHtml(note)}</p>`);
  }
  return rows.join("");
}

function interestNotificationEmailHtml({ flatId, contact, note, moveIn, gender, parkingRequired, parkingCount }) {
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
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Someone's interested in your listing</h1>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                  A seeker tapped "I'm interested" on your flat listing (ID <strong>${flatId}</strong>). Here's
                  what they shared — there's no in-app messaging on Chitwan Rent, so reach out directly.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
                  <tr>
                    <td style="border-radius:12px;background-color:#f4f4f7;padding:16px 18px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong>Contact:</strong> ${escapeHtml(contact)}</p>
                      ${interestDetailRowsHtml({ moveIn, gender, parkingRequired, parkingCount, note })}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  This is an automated notice — no action is needed unless you'd like to reach out.
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

// Fired once per interest submission (see POST /:id/interest in
// routes/flats.js), right after the flat_interests row is inserted. Same
// throw-on-failure, log-and-continue contract as every other send*Email
// function here — a failed send never turns a successful interest
// submission into an error response.
export async function sendInterestNotificationEmail({ to, flatId, contact, note, moveIn, gender, parkingRequired, parkingCount }) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Someone's interested in your Chitwan Rent listing",
    html: interestNotificationEmailHtml({ flatId, contact, note, moveIn, gender, parkingRequired, parkingCount }),
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

// --- Combined multi-section digest (multiple due rows, same email) ---
//
// Used only when digestJob.js's grouping finds more than one due row (flat
// and/or seeker pin) sharing the same email in a single run — a single due
// row still goes through sendFlatMatchDigest/sendSeekerMatchDigest above,
// unchanged. Built as separate functions rather than parametrizing
// digestShellHtml/sendFlatMatchDigest/sendSeekerMatchDigest so the existing
// single-row email's output can't be affected by this addition.

// Per-section unsubscribe line — deliberately NOT the shared digestFooterHtml
// used by the single-row emails, since a combined email must let someone
// unsubscribe just ONE of their listings/searches without touching the
// others (their unsubscribe tokens are never merged).
function sectionUnsubscribeHtml(unsubscribeUrl, itemLabel) {
  return `
    <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;">
      Done with this ${escapeHtml(itemLabel)}? <a href="${unsubscribeUrl}" style="color:#7c3aed;">Unsubscribe just this one</a> — your other items above stay active.
    </p>`;
}

function sectionDividerHtml() {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-top:1px solid #e5e7eb;line-height:0;font-size:0;">&nbsp;</td></tr>
    </table>`;
}

function flatSectionHtml({ flat, matches, unsubscribeUrl }) {
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
  return recapHtml + matchesHtml + sectionUnsubscribeHtml(unsubscribeUrl, "listing");
}

function seekerSectionHtml({ seeker, matches, unsubscribeUrl }) {
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
  return recapHtml + matchesHtml + sectionUnsubscribeHtml(unsubscribeUrl, "search");
}

// Footer for the combined shell only — no single shared unsubscribe link
// (each section already has its own above), just the optional reply-to note
// and the standard "ignore if irrelevant" line.
function digestMultiFooterHtml() {
  const replyLine = process.env.DIGEST_REPLY_TO
    ? `<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Reply to this email and it reaches ${escapeHtml(process.env.DIGEST_REPLY_TO)} directly.</p>`
    : "";
  return `
    ${replyLine}
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      Each item above repeats weekly on its own schedule for as long as it stays up — use that item's own
      unsubscribe link above if you want to stop just one.
    </p>`;
}

function digestShellMultiHtml({ heading, summaryLine, sectionsHtml }) {
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

                ${sectionsHtml}
                ${digestMultiFooterHtml()}
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

// Sent instead of sendFlatMatchDigest/sendSeekerMatchDigest when one email
// address owns more than one due row (flat and/or seeker pin, in any mix)
// in the same digest run — see lib/digestJob.js's grouping in runDigestJob().
// One email, one labeled section per row (each section's own recap +
// matches + own unsubscribe link, never merged), instead of separate emails.
export async function sendCombinedDigest({ to, sections }) {
  const sectionsHtml = sections
    .map((section, index) => {
      const body =
        section.kind === "flat"
          ? flatSectionHtml(section)
          : seekerSectionHtml(section);
      return index < sections.length - 1 ? body + sectionDividerHtml() : body;
    })
    .join("");

  const totalMatches = sections.reduce((sum, section) => sum + section.matches.length, 0);
  const firstNamed = sections.find((section) => section.ownerName || section.seekerName);
  const greeting = firstNamed ? `Hi ${firstNamed.ownerName || firstNamed.seekerName}, we` : "We";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    ...(process.env.DIGEST_REPLY_TO ? { replyTo: process.env.DIGEST_REPLY_TO } : {}),
    subject: "This week's Chitwan Rent digest",
    html: digestShellMultiHtml({
      heading: `Your Chitwan Rent digest — ${sections.length} active items`,
      summaryLine: `${greeting} found ${totalMatches} match${totalMatches === 1 ? "" : "es"} across the ${sections.length} active items below within 2km.`,
      sectionsHtml,
    }),
  });
}
