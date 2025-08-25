// src/controllers/emailController.ts
import { Request, Response } from "express";
import { sendEmail } from "../lib/emailService";
import {
  emailVerificationTemplate,
  forgotPasswordTemplate,
  eventTicketTemplate
} from '../aws/emailTemplates'

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

export const sendEventTicketEmail = async (req: Request, res: Response) => {
  const { email, eventName, ticketDetails } = req.body;

  try {
    const { subject, htmlBody } = eventTicketTemplate(eventName, ticketDetails);
    await sendEmail({ to: email, subject, htmlBody });
    res.status(200).json({ message: "Event ticket email sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send event ticket email" });
  }
};