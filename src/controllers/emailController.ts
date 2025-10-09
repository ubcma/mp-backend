// src/controllers/emailController.ts
import { Request, Response } from "express";
import { sendEmail } from "../lib/emailService";
import {
  emailVerificationTemplate,
  forgotPasswordTemplate,
  eventReceiptWithTicketTemplate
} from '../aws/emailTemplates'
import { sendReceiptEmail } from "../lib/receipts";

export const sendVerificationEmail = async (req: Request, res: Response) => {
  const { email, verificationLink } = req.body;

  try {
    const { subject, htmlBody } = emailVerificationTemplate(verificationLink);
    await sendEmail({ to: email, subject, htmlBody });
    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send verification email" });
  }
};

export const sendForgotPasswordEmail = async (req: Request, res: Response) => {
  const { email, resetLink } = req.body;

  try {
    const { subject, htmlBody } = forgotPasswordTemplate(resetLink);
    await sendEmail({ to: email, subject, htmlBody });
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send password reset email" });
  }
};


// Manual/test receipt trigger (calls lib/receipts) without stripe webhook trigger required 
export const sendReceipt = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      paymentIntentId,
      amountInCents,
      currency,
      purchaseType,
      eventId,
    } = req.body;

    if (!userId || !paymentIntentId || !amountInCents || !currency || !purchaseType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await sendReceiptEmail({
      userId,
      paymentIntentId,
      amountInCents,
      currency,
      purchaseType,
      eventId: eventId ?? null,
    });

    res.status(200).json({ message: "Receipt email queued/sent" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to send receipt email" });
  }
};

