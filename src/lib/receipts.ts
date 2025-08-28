// src/lib/receipts.ts
import { db } from "../db";
import { eq } from "drizzle-orm";
import { userProfile } from "../db/schema/userProfile";
import { event as eventsTable } from "../db/schema/event";
import { sendEmail } from "../lib/emailService";
import { membershipReceiptTemplate, eventReceiptWithTicketTemplate } from "../aws/emailTemplates";
import { Redis } from "ioredis";

const redis = new Redis(`${process.env.REDIS_URL}?family=0`);

// In non-prod (dev/sandbox), force all test receipts to this inbox.
// In prod, we’ll use the real user email from DB.
const TEST_RECEIPT_EMAIL = process.env.TEST_RECEIPT_EMAIL ?? "hello@ubcma.ca";

type Currency = "cad" | "usd";

export async function sendReceiptEmail(opts: {
  userId: string;
  paymentIntentId: string;
  amountInCents: number;
  currency: string;
  purchaseType: "membership" | "event";
  eventId?: number | null;
}) {
  // Idempotency guard (avoid duplicate sends on webhook retries)
  const key = `email:pi:${opts.paymentIntentId}`;
  const setOk = await redis.set(key, "1", "EX", 60 * 60 * 24, "NX");
  if (setOk === null) {
    console.log("Receipt email already sent; skipping.");
    return;
  }

  // Lookup user (for name + real email)
  const [user] = await db
    .select({ name: userProfile.name, email: userProfile.email })
    .from(userProfile)
    .where(eq(userProfile.userId, opts.userId))
    .limit(1);

  // Choose recipient:
  // - production: real user email
  // - non-production: forced test inbox
  const isProd = process.env.NODE_ENV === "production";
  const to = isProd ? user?.email : TEST_RECEIPT_EMAIL;

  if (!to) {
    console.warn(
      "[receipts] No recipient email resolved. (isProd=%s, dbEmail=%s, TEST_RECEIPT_EMAIL=%s) — skipping.",
      isProd,
      user?.email,
      TEST_RECEIPT_EMAIL
    );
    return;
  }

  const purchaseDateISO = new Date().toISOString();
  const currency = (opts.currency?.toLowerCase() as Currency) || "cad";

  if (opts.purchaseType === "membership") {
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

  // combine receipt and ticket 
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

  const defaultTicketCode = `T-${opts.paymentIntentId.slice(-8).toUpperCase()}`;

  const { subject, htmlBody, textBody } = eventReceiptWithTicketTemplate({
    name: user?.name ?? null,
    email: to, // show recipient in email body
    amountInCents: opts.amountInCents,
    currency,
    paymentIntentId: opts.paymentIntentId,
    purchaseDateISO,
    event: eventMeta,
    ticket: {
      code: defaultTicketCode,
      seat: null,
      qrImageUrl: null, // plug in later if you host QR images
    },
  });

  console.log("[receipts] isProd=%s  TEST_RECEIPT_EMAIL=%s  dbEmail=%s  NODE_ENV=%s",
  process.env.NODE_ENV === "production",
  TEST_RECEIPT_EMAIL,
  user?.email,
  process.env.NODE_ENV
);

  await sendEmail({ to, subject, htmlBody, textBody });
}
