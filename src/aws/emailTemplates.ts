
type Currency = "cad" | "usd";

const fmtAmt = (cents: number, currency: Currency = "cad") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const base = `font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.5;`;

export const emailVerificationTemplate = (verificationLink: string) => ({
  subject: "Verify Your UBCMA Email Address",
  htmlBody: `
    <h1>Email Verification</h1>
    <p>Please verify your membership portal account by clicking the link below:</p>
    <a href="${verificationLink}">Verify Email</a>
  `,
});

export const forgotPasswordTemplate = (resetLink: string) => ({
  subject: "Reset Your Password",
  htmlBody: `
    <h1>Password Reset</h1>
    <p>You requested to reset your password to the MA membership portal. Click the link below to proceed:</p>
    <a href="${resetLink}">Reset Password</a>
  `,
});

// render the ticket embedded inside the receipt (right now only have ticket code)
export const renderTicketBlock = (t: {
  code?: string | null;
  seat?: string | null;
  qrImageUrl?: string | null;
}) => `
  <div style="border:1px solid #eee; border-radius:12px; padding:16px; margin:12px 0; background:#fafafa">
    <h3 style="margin-top:0">🎟️ Your Ticket</h3>
    ${t.qrImageUrl ? `<img src="${t.qrImageUrl}" alt="QR code" style="display:block; max-width:180px; width:100%; height:auto; margin:8px 0;"/>` : ""}
    ${t.code ? `<p style="margin:8px 0;"><strong>Ticket Code:</strong> <span style="font-family:monospace">${t.code}</span></p>` : ""}
    ${t.seat ? `<p style="margin:8px 0;"><strong>Seat:</strong> ${t.seat}</p>` : ""}
    <p style="margin:8px 0; font-size:12px; color:#555">
      Present this ticket (code or QR) at entry. Keep this email handy.
    </p>
  </div>
`;

export const eventReceiptWithTicketTemplate = (p: {
  name?: string | null;
  email: string;
  amountInCents: number;
  currency: Currency;
  paymentIntentId?: string | null;
  purchaseDateISO: string;
  event: { name: string; startAtISO?: string | null; endAtISO?: string | null; location?: string | null };
  ticket?: { code?: string | null; seat?: string | null; qrImageUrl?: string | null };
}) => {
  const subject = `🎟 Your Ticket — ${p.event.name}`;

  const when = [
    p.event.startAtISO
      ? `<li><strong>Starts:</strong> ${new Date(p.event.startAtISO).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</li>`
      : "",
    p.event.endAtISO
      ? `<li><strong>Ends:</strong> ${new Date(p.event.endAtISO).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</li>`
      : "",
    p.event.location ? `<li><strong>Location:</strong> ${p.event.location}</li>` : "",
  ].join("");

  const htmlBody = `
  <div style="font-family:'Onest',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
              color:#111; line-height:1.6; background-color:#f9fafb; padding:32px 0;">
    <center>
      <table style="max-width:580px; width:100%; background:#fff; border-radius:12px; 
                    box-shadow:0 3px 10px rgba(0,0,0,0.06); overflow:hidden; border-collapse:separate;">
        <tr>
          <td style="padding:32px; text-align:center; border-bottom:3px solid #E11D48;">
            <h1 style="color:#E11D48; font-size:28px; margin:0 0 8px;">🎫 Ticket Confirmation</h1>
            <p style="margin:0; color:#444;">Thanks${p.name ? `, <strong>${p.name}</strong>` : ""}! 
              Your ${p.amountInCents > 0 ? "purchase" : "registration"} is confirmed.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px;">
            <h2 style="margin:0 0 8px; color:#E11D48; font-size:22px;">${p.event.name}</h2>
            <ul style="list-style:none; padding:0; margin:0 0 16px; color:#444;">
              ${when}
            </ul>

            <div style="background:#fff7f8; border:1px solid #f2d8dc; 
                        border-radius:10px; padding:20px; margin:24px 0;">
              <h3 style="margin:0 0 12px; color:#E11D48;">🎟 Your Ticket</h3>
              ${p.ticket?.qrImageUrl
                ? `<img src="${p.ticket.qrImageUrl}" alt="QR Code" width="180" height="180" 
                    style="display:block; margin:12px auto; border-radius:8px;"/>`
                : ""}
              ${p.ticket?.code
                ? `<p style="margin:6px 0; font-size:15px; text-align:center;">
                     <strong>Ticket Code:</strong> 
                     <span style="font-family:monospace; color:#E11D48;">${p.ticket.code}</span>
                   </p>`
                : ""}
              ${p.ticket?.seat
                ? `<p style="margin:6px 0; text-align:center;"><strong>Seat:</strong> ${p.ticket.seat}</p>`
                : ""}
              <p style="margin:10px 0 0; font-size:13px; color:#666; text-align:center;">
                Present this ticket (code or QR) at entry. Keep this email handy.
              </p>
            </div>

            <h3 style="margin-bottom:8px; color:#E11D48;">💳 Transaction Details</h3>
            <ul style="list-style:none; padding:0; margin:0; color:#444; font-size:15px;">
              <li><strong>Amount Paid:</strong> ${fmtAmt(p.amountInCents, p.currency)}</li>
              ${p.paymentIntentId ? `<li><strong>Transaction ID:</strong> ${p.paymentIntentId}</li>` : ""}
              <li><strong>Purchase Date:</strong> 
                ${new Date(p.purchaseDateISO).toLocaleString("en-CA",{timeZone:"America/Vancouver"})}</li>
              <li><strong>Receipt sent to:</strong> ${p.email}</li>
            </ul>

            <p style="margin:20px 0 0; font-size:13px; color:#777;">
              <em>All ${p.amountInCents > 0 ? "ticket purchases" : "registrations"} are final.</em>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px; text-align:center; background:#fef2f3; color:#E11D48;
                     font-size:13px; border-top:1px solid #f2d8dc;">
            <strong>UBCMA Membership Portal</strong><br/>
            <span style="color:#999;">Copyright © 2025 UBCMA</span>
          </td>
        </tr>
      </table>
    </center>
  </div>
  `;

  const textBody = [
    `🎫 Ticket Confirmation — ${p.event.name}`,
    `Thanks${p.name ? `, ${p.name}` : ""}! Your ${p.amountInCents > 0 ? "purchase" : "registration"} is confirmed.`,
    "",
    "Event:",
    `  Name: ${p.event.name}`,
    p.event.startAtISO ? `  Starts: ${new Date(p.event.startAtISO).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}` : "",
    p.event.endAtISO ? `  Ends: ${new Date(p.event.endAtISO).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}` : "",
    p.event.location ? `  Location: ${p.event.location}` : "",
    "",
    "Ticket:",
    p.ticket?.code ? `  Code: ${p.ticket.code}` : "",
    p.ticket?.seat ? `  Seat: ${p.ticket.seat}` : "",
    p.ticket?.qrImageUrl ? `  QR: ${p.ticket.qrImageUrl}` : "",
    "",
    "Transaction:",
    `  Amount: ${fmtAmt(p.amountInCents, p.currency)}`,
    p.paymentIntentId ? `  Transaction ID: ${p.paymentIntentId}` : "",
    `  Purchase Date: ${new Date(p.purchaseDateISO).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}`,
    `  Receipt sent to: ${p.email}`,
  ].filter(Boolean).join("\n");

  return { subject, htmlBody, textBody };
};



export const membershipReceiptTemplate = (p: {
  name?: string | null;
  email: string;
  amountInCents: number;
  currency: Currency;
  paymentIntentId: string;
  purchaseDateISO: string;
}) => {
  const subject = "UBCMA Membership — Payment Confirmation";
  const htmlBody = `
  <div style="${base}">
    <h1>🎟 Your Membership is Confirmed</h1>
    <p>Thanks${p.name ? `, ${p.name}` : ""}! Your UBCMA membership payment is complete.</p>
    <h2>Order Summary</h2>
    <ul>
      <li><strong>Item:</strong> UBCMA Membership (current academic year)</li>
      <li><strong>Amount Paid:</strong> ${fmtAmt(p.amountInCents, p.currency)}</li>
      <li><strong>Transaction ID:</strong> ${p.paymentIntentId}</li>
      <li><strong>Purchase Date:</strong> ${new Date(p.purchaseDateISO).toLocaleString("en-CA",{timeZone:"America/Vancouver"})}</li>
      <li><strong>Receipt sent to:</strong> ${p.email}</li>
    </ul>
    <p><em>All purchases are final sale.</em></p>
    <hr/><p style="font-size:12px;color:#666">Need help? Reply to this email.</p>
  </div>`;
  return { subject, htmlBody };
};

/*
old modularized code (does not include ticket) 

export const eventReceiptTemplate = (p: {
  name?: string | null;
  email: string;
  amountInCents: number;
  currency: Currency;
  paymentIntentId: string;
  purchaseDateISO: string;
  event: { name: string; startAtISO?: string | null; endAtISO?: string | null; location?: string | null };
}) => {
  const subject = `Your Ticket — ${p.event.name}`;
  const htmlBody = `
  <div style="${base}">
    <h1>🎫 Ticket Confirmation</h1>
    <p>Thanks${p.name ? `, ${p.name}` : ""}! Your ticket is confirmed.</p>
    <h2>${p.event.name}</h2>
    <ul>
      ${p.event.startAtISO ? `<li><strong>Starts:</strong> ${new Date(p.event.startAtISO).toLocaleString("en-CA",{timeZone:"America/Vancouver"})}</li>` : ""}
      ${p.event.endAtISO ? `<li><strong>Ends:</strong> ${new Date(p.event.endAtISO).toLocaleString("en-CA",{timeZone:"America/Vancouver"})}</li>` : ""}
      ${p.event.location ? `<li><strong>Location:</strong> ${p.event.location}</li>` : ""}
    </ul>
    <h2>Transaction Details</h2>
    <ul>
      <li><strong>Amount Paid:</strong> ${fmtAmt(p.amountInCents, p.currency)}</li>
      <li><strong>Transaction ID:</strong> ${p.paymentIntentId}</li>
      <li><strong>Purchase Date:</strong> ${new Date(p.purchaseDateISO).toLocaleString("en-CA",{timeZone:"America/Vancouver"})}</li>
      <li><strong>Receipt sent to:</strong> ${p.email}</li>
    </ul>
    <p><em>All ticket purchases are final sale.</em></p>
    <hr/><p style="font-size:12px;color:#666">Keep this email for door check-in. Apple Wallet pass coming soon.</p>
  </div>`;
  return { subject, htmlBody };
};
*/