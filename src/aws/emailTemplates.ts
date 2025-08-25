export const emailVerificationTemplate = (verificationLink: string) => ({
  subject: "Verify Your Email Address",
  htmlBody: `
    <h1>Email Verification</h1>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verificationLink}">Verify Email</a>
  `,
});

export const forgotPasswordTemplate = (resetLink: string) => ({
  subject: "Reset Your Password",
  htmlBody: `
    <h1>Password Reset</h1>
    <p>You requested to reset your password. Click the link below to proceed:</p>
    <a href="${resetLink}">Reset Password</a>
  `,
});

export const eventTicketTemplate = (eventName: string, ticketDetails: string) => ({
  subject: `Your Ticket for ${eventName}`,
  htmlBody: `
    <h1>Event Ticket</h1>
    <p>Thank you for registering for ${eventName}. Here are your ticket details:</p>
    <pre>${ticketDetails}</pre>
  `,
});