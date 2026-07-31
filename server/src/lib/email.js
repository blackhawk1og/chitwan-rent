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
