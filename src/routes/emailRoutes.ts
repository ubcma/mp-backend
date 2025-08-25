import express from "express";
import {
  sendVerificationEmail,
  sendForgotPasswordEmail,
  sendEventTicketEmail,
} from "../controllers/emailController";

const emailRouter = express.Router();

emailRouter.post("/send-verification-email", sendVerificationEmail);
emailRouter.post("/send-forgot-password-email", sendForgotPasswordEmail);
emailRouter.post("/send-event-ticket-email", sendEventTicketEmail);

export default emailRouter;