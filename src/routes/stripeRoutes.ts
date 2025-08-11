// src/routes/stripe.routes.ts
import { Router } from 'express';
import {
  handleStripeWebhook, // app.ts handles the webhook directly 
  handleCreatePaymentIntent,
  handleGetPaymentIntent,
} from "../controllers/stripeController"
import { asyncHandler } from '../lib/asyncHandler';

// call the library function to create a payment intent via the controller 
// create a webhook (webhook should live in here) (/webhook) (from the stripe sdk)

const stripeRouter = Router();

// route to create the payment intent via controller and lib logic via a post request 
// async control function returns the client secret to return to frontend 
stripeRouter.post('/create-payment-intent', asyncHandler(handleCreatePaymentIntent));
stripeRouter.get('/payment-intent/:userId', handleGetPaymentIntent);

export default stripeRouter;