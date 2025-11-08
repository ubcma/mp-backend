import { Request, Response } from "express";
import { db } from "../db";
import { eventRegistration } from "../db/schema/event";
import { eq } from "drizzle-orm";

export const ticketScanHandler = async (req: Request, res: Response) => {
  const { ticketCode } = req.params;
  if (!ticketCode) return res.status(400).send("Missing ticket code");

  const [registration] = await db
    .select()
    .from(eventRegistration)
    .where(eq(eventRegistration.ticketCode, ticketCode))
    .limit(1);

  if (!registration) {
    return res.status(404).send(`
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="font-family:'Onest',sans-serif; text-align:center; background:#f9fafb; margin:0;">
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh;">
            <div style="background:white; padding:40px 60px; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <h1 style="color:#E11D48; font-size:2.25rem; margin-bottom:0.5rem;">❌ Invalid Ticket</h1>
              <p style="font-size:1rem; color:#555;">No record found for ticket code:</p>
              <p style="font-weight:600; font-size:1.1rem;">${ticketCode}</p>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  await db
    .update(eventRegistration)
    .set({
      status: "checkedIn",
      checkedInAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(eventRegistration.id, registration.id));

  const checkInTime = new Date().toLocaleString("en-CA", { timeZone: "America/Vancouver" });

  return res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="3;url=https://app.ubcma.ca/admin-dashboard" />
        <title>UBCMA — Ticket Checked In</title>
        <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #fff5f5, #ffe8e8);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }

          .card {
            background: white;
            padding: 50px 70px;
            border-radius: 18px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
            text-align: center;
            animation: fadeIn 0.6s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes shake {
            0%, 100% { transform: rotate(0); }
            20% { transform: rotate(10deg); }
            40% { transform: rotate(-10deg); }
            60% { transform: rotate(6deg); }
            80% { transform: rotate(-6deg); }
          }

          @keyframes fadeOut {
            to { opacity: 0; transform: scale(0.5); }
          }

          @keyframes popIn {
            from { opacity: 0; transform: scale(0.3); }
            80% { opacity: 1; transform: scale(1.1); }
            to { transform: scale(1); }
          }

          .emoji {
            font-size: 70px;
            color: #E11D48;
            display: inline-block;
            animation: shake 0.8s ease forwards, fadeOut 0.3s ease 0.8s forwards;
          }

          .checkmark {
            font-size: 70px;
            color: #E11D48;
            display: none;
            animation: popIn 0.5s ease forwards;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="emoji" id="emoji">🎫</div>
          <div class="checkmark" id="checkmark">✅</div>
          <h1 style="color:#E11D48; font-size:2rem; margin:0.5em 0;">Ticket Checked In</h1>
          <p style="color:#333; font-size:1.05rem;">Ticket Code: <strong>${ticketCode}</strong></p>
          <p style="color:#555; font-size:0.95rem;">Checked in at: ${checkInTime}</p>
          <p style="margin-top:1.5em; color:#888; font-size:0.9rem;">Redirecting to Admin Dashboard...</p>
          <p style="margin-top:2em; font-size:0.8rem; color:#aaa;">UBCMA Membership Portal</p>
        </div>

        <script>
          const ticket = document.getElementById("emoji");
          const checkmark = document.getElementById("checkmark");

          setTimeout(() => {
            ticket.style.display = "none";
            checkmark.style.display = "inline-block";
          }, 1000);
        </script>
      </body>
    </html>
  `);
};
