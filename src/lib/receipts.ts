// src/lib/receipts.ts
import { db } from "../db";
import { eq } from "drizzle-orm";
import { userProfile } from "../db/schema/userProfile";
import { event as eventsTable } from "../db/schema/event";
import { sendEmail } from "../lib/emailService";
import { membershipReceiptTemplate, eventReceiptWithTicketTemplate } from "../aws/emailTemplates";
import { Redis } from "ioredis";
import { uploadFileToS3 } from "../aws/s3Client"; // adjust path if needed

const redis = new Redis(`${process.env.REDIS_URL}?family=0`);


type Currency = "cad" | "usd";

type EmailOptions = {

}

// generates ticket code, uploads QR to S3, sends email with ticket link

export async function sendReceiptEmail(opts: { //single options object to send all arguments  
  userId: string;
  paymentIntentId?: string; // changed to optional 
  amountInCents?: number;
  currency?: string;
  purchaseType: "membership" | "event";
  eventId?: number;
})
 {
  // Idempotency guard (avoid duplicate sends on webhook retries OR createRegistration call)
  const redisKey = opts.paymentIntentId
    ? `email:pi:${opts.paymentIntentId}` // payment ID 
    : `email:free:${opts.userId}:${opts.eventId}`; // FIX: in case the event is free, we use redis fallback on the user and event id rather than payment 

  const setOk = await redis.set(redisKey, "1", "EX", 60 * 60 * 24, "NX");
  if (setOk === null) {
    console.log("Receipt email already sent; skipping.");
    return;
  }

  // Lookup the user for the email and name (based on id)
  const [user] = await db
    .select({ name: userProfile.name, email: userProfile.email })
    .from(userProfile)
    .where(eq(userProfile.userId, opts.userId))
    .limit(1);

  const to = user?.email;
  if (!to) {
    console.warn("[receipts] No recipient email found — skipping.", user?.email);
    return;
  }

  const purchaseDateISO = new Date().toISOString();
  const currency: Currency = opts.currency?.toLowerCase() === "usd" ? "usd" : "cad";
  const amountInCents = opts.amountInCents ?? 0;

  // case one: purchase type == membership!! 

  if ((opts.purchaseType === "membership")  && (opts.paymentIntentId && opts.amountInCents != null)) {
    const { subject, htmlBody } = membershipReceiptTemplate({
      name: user?.name ?? null,
      email: to, // show recipient in email body
      amountInCents: opts.amountInCents,
      currency,
      paymentIntentId: opts.paymentIntentId,
      purchaseDateISO,
    });
    await sendEmail({ to, subject, htmlBody });
    return;
  }

 // case two: purchase type == event!! 

  let eventMeta = {
    name: "UBCMA Event",
    startAtISO: null as string | null,
    endAtISO: null as string | null,
    location: null as string | null,
  };

  if (opts.eventId) {
    const [evt] = await db
      .select({
        name: eventsTable.title,      
        startAt: eventsTable.startsAt, 
        endAt: eventsTable.endsAt,    
        location: eventsTable.location,
      })
      .from(eventsTable)
      .where(eq(eventsTable.id, opts.eventId))
      .limit(1);

    if (evt) {
      eventMeta = {
        name: evt.name,
        startAtISO: evt.startAt ? new Date(evt.startAt).toISOString() : null,
        endAtISO: evt.endAt ? new Date(evt.endAt).toISOString() : null,
        location: evt.location ?? null,
      };
    }
  }

// Generate a ticket code for both paid and unpaid scenarios 
const defaultTicketCode = opts.paymentIntentId
  ? `T-${opts.paymentIntentId.slice(-8).toUpperCase()}`
  : `F-${opts.userId.slice(-6).toUpperCase()}-${opts.eventId ?? "X"}`;

let qrProxyUrl: string | null = null;
try {
  // Use CommonJS require for qrcode
  const QRCode = require("qrcode");

  // Generate QR image buffer
  const qrBuffer = await QRCode.toBuffer(defaultTicketCode, {
    type: "png",
    width: 300,
    errorCorrectionLevel: "H",
  });

  // Upload QR to private S3
  await uploadFileToS3({
    key: `tickets/${defaultTicketCode}.png`,
    body: qrBuffer,
    contentType: "image/png",
    acl: "private",
  });

  // Build proxy URL (served via Express, not S3)
  qrProxyUrl = `${process.env.FRONTEND_ORIGIN || process.env.BACKEND_URL}/api/qr/${defaultTicketCode}`;

} catch (err) {
  console.error("[receipts] Failed to generate or upload QR:", err);
}

const { subject, htmlBody, textBody } = eventReceiptWithTicketTemplate({
  name: user?.name ?? null,
  email: to,
  amountInCents,
  currency,
  paymentIntentId: opts.paymentIntentId ?? null,
  purchaseDateISO,
  event: eventMeta,
  ticket: {
    code: defaultTicketCode,
    seat: null,
    qrImageUrl: qrProxyUrl, 
  },
});

  console.log("[receipts] isProd=%s  TEST_RECEIPT_EMAIL=%s  dbEmail=%s  NODE_ENV=%s",
  user?.email,
  process.env.NODE_ENV
);

  await sendEmail({ to, subject, htmlBody, textBody });
}
