import { Request, Response } from "express";
import { db } from "../db";
import { eventRegistration } from "../db/schema/event";
import { eq } from "drizzle-orm";

export const ticketScanHandler = async (req: Request, res: Response) => {
  const { ticketCode } = req.params;
  if (!ticketCode) {
    return res.status(400).send("Missing ticket code");
  }

  // Find registration
  const [registration] = await db
    .select()
    .from(eventRegistration)
    .where(eq(eventRegistration.ticketCode, ticketCode))
    .limit(1);

  if (!registration) {
    return res.status(404).send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;margin-top:80px;">
          <h1 style="color:red;">❌ Invalid Ticket</h1>
          <p>No record found for ticket code: <strong>${ticketCode}</strong></p>
        </body>
      </html>
    `);
  }

  // Update status → checkedIn
  await db
    .update(eventRegistration)
    .set({
      status: "checkedIn",
      checkedInAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(eventRegistration.id, registration.id));

  // Return confirmation page
  return res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="3;url=https://app.ubcma.ca/admin-dashboard" />
      </head>
      <body style="font-family:sans-serif;text-align:center;margin-top:80px;">
        <h1 style="color:green;">✅ Ticket Checked In</h1>
        <p>Ticket Code: <strong>${ticketCode}</strong></p>
        <p>Checked In At: ${new Date().toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</p>
        <p>Redirecting to admin dashboard...</p>
      </body>
    </html>
  `);
};
