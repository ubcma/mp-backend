// src/lib/ticket.ts
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { eventRegistration } from "../db/schema/event";
import { uploadFileToS3 } from "../aws/s3Client";

export async function generateTicket({
  userId,
  eventId,
  paymentIntentId,
}: {
  userId: string;
  eventId: number;
  paymentIntentId?: string; // can be null in the case of a free event 
}) {
    // regex generation of a ticketcode 
  const ticketCode = paymentIntentId
    ? `T-${paymentIntentId.slice(-8).toUpperCase()}`
    : `F-${userId.slice(-6).toUpperCase()}-${eventId ?? "X"}`;

  let qrProxyUrl: string | null = null;
  let qrBuffer: Buffer; // define as non-nullable now
  const scanUrl = `${process.env.BACKEND_URL}/api/ticket/scan/${ticketCode}`;

  try {
    const QRCode = require("qrcode");
    qrBuffer = await QRCode.toBuffer(scanUrl, {
      type: "png",
      width: 300,
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("[ticket] Failed to generate QR buffer:", err);
    throw new Error("QR generation failed"); // STOP HERE to prevent null upload
  }

  // now qrBuffer is guaranteed to exist
  await uploadFileToS3({
    key: `tickets/${ticketCode}.png`,
    body: qrBuffer, 
    contentType: "image/png",
  });
  /*
  qrProxyUrl = `${process.env.FRONTEND_ORIGIN || process.env.BACKEND_URL}/api/qr/${ticketCode}`;
  */
  qrProxyUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/tickets/${ticketCode}.png`;

  // (INSERT THE TICKET CODE INTO THE EVENT REGISTRATION TABLE)
  const [existing] = await db
    .select()
    .from(eventRegistration)
    .where(and(eq(eventRegistration.userId, userId), eq(eventRegistration.eventId, eventId)))
    .limit(1);

  if (existing) {
    await db
      .update(eventRegistration)
      .set({ ticketCode, updatedAt: new Date() })
      .where(eq(eventRegistration.id, existing.id));
  } else {
    await db.insert(eventRegistration).values({
      userId,
      eventId,
      ticketCode,
      stripeTransactionId: paymentIntentId ?? null,
      status: "registered",
    });
  }

  return { ticketCode, qrBuffer, qrProxyUrl, scanUrl };
}