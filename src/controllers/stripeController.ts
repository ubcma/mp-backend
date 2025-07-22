// control database logic for purchase 

// we have purchases, but could be event or a membership
// need to include the appropriate response 

// request forwarded from route 
// response - send back the url and success to the frontend for api 

// we should use helpers from lib/stripe.ts to interact with stripe sdk and db, keep it sanitary here (all raw logic should be in library folder)

import { Request, Response } from "express";
import {verifyStripeWebhook, 
        createPaymentIntent, 
        getPaymentIntentForUser,
        processPaymentIntent} from "../lib/stripe"
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { eq } from "drizzle-orm";
import { users } from "../db/schema/auth";
import { auth } from "../lib/auth";
import Stripe from 'stripe';
import { event } from "../db/schema/event";

require('dotenv').config({ path: ['.env.development.local', '.env'] }) // changed to accept .env.development.local


export const handleCreatePaymentIntent = async (req: Request, res: Response) => {
  try {
    const { purchaseType, userId, amount, currency = 'cad' } = req.body;
    const paymentIntent = await createPaymentIntent(purchaseType, userId, amount, currency); // taken from teh library
    res.json({ clientSecret: paymentIntent.client_secret }); // send client secret back as response 
    console.log('Client secret:', paymentIntent.client_secret);

  } catch (err) {
    console.error("Error creating PaymentIntent:", err);
    res.status(500).json({ error: 'Failed to create PaymentIntent' });
  }
};


export const handleGetPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const paymentIntent = await getPaymentIntentForUser(userId);
    if (!paymentIntent) {
      res.status(404).json({ error: 'Payment Intent not found' });
      return; // need to return because async 
    }
    res.json({ paymentIntent });
  } catch (error) {
    console.error("Error retrieving PaymentIntent:", error);
    res.status(500).json({ error: "Failed to retrieve PaymentIntent" });
    return;
  }
};

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(req, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log("Stripe webhook hit");

  } catch (err) {
    console.error('Webhook signature validation failed:', err);
    res.status(400).send('Webhook signature failed');
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.log(` PaymentIntent succeeded: ${intent.id}`);
        // TEMPORARILY DISABLED, but add back when transactions verified await processPaymentIntent(intent); // process: insert into db, clear redis cache
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.warn(`PaymentIntent failed: ${intent.id}`);
        break;
      }
      default:
        console.log(`🔔 Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Webhook processing error');
  }
};

/*
export const handleCreatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { type, card } = req.body;
    const paymentMethod = await createPaymentMethod(type, card);
    res.json({ paymentMethod });
  } catch (error) {
    console.error("Error creating PaymentMethod:", error);
    res.status(500).json({ error: "Failed to create PaymentMethod" });
  }
};
*/

    /*

    LIBRARY LOGIC 
    - If `payment_intent.succeeded`, fetch metadata from Redis
    - Insert into DB accordingly (`membership` or `event_signup`)
    - Remove Redis entry
    /*

// src/controllers/stripeController.ts
import { Request, Response } from "express";
import { createCheckoutSession, verifyStripeWebhook } from "../lib/stripe";

export const handleCreateCheckoutSession = async (req: Request, res: Response) => {
  const { userId, eventId, formResponses } = req.body;

  try {
    const sessionUrl = await createCheckoutSession(userId, eventId, formResponses);
    return res.status(200).json({ url: sessionUrl });
  } catch (err) {
    console.error("Error creating Stripe session:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const event = verifyStripeWebhook(req);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // TODO: Pull form data from Redis and update DB (transactions.ts, userProfile.ts)
      console.log("Payment complete:", session.id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(" Webhook error:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

export const handleCreateCheckoutSession = async (req: Request, res: Response) => {
  const { userId, eventId, formResponses } = req.body;
  try {
    const sessionUrl = await createCheckoutSession(userId, eventId, formResponses);
    return res.status(200).json({ url: sessionUrl });
  } catch (err) {
    console.error("Error creating Stripe session:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
  */

