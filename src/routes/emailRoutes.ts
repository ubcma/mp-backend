import express from "express";
import { asyncHandler } from "../lib/asyncHandler";


import {
  sendVerificationEmail,
  sendForgotPasswordEmail,
  sendReceipt
} from "../controllers/emailController";

const emailRouter = express.Router();

emailRouter.post("/send-verification-email", sendVerificationEmail);
emailRouter.post("/send-forgot-password-email", sendForgotPasswordEmail);
emailRouter.post("/send-receipt", asyncHandler(sendReceipt)); // for manual / resending the receipt and/or ticket 

export default emailRouter;