// control database logic for purchase 

// we have purchases, but could be event or a membership
// need to include the appropriate response 

// frontend request forwarded from route 
// frontend response - send back payment intent client secret the url and success to the frontend for api 

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

/*
Create the payment intent via stripe sdk in stripe.ts 
*/
/*
Create the payment intent via stripe sdk in stripe.ts 
*/
export const handleCreatePaymentIntent = async (req: Request, res: Response) => {
  const headers = new Headers();

  if (req.headers.cookie) {
    headers.append('cookie', req.headers.cookie);
  }

  try {
    const session = await auth.api.getSession({ headers });

    const user = session?.user;
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.id;

    const { purchaseType, amount, currency = 'cad' } = req.body; // pass the request body into the helper function for creation of paymentintent
    const paymentIntent = await createPaymentIntent(purchaseType, userId, amount, currency); // taken from the  library
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id,  metadata:paymentIntent.metadata}); // send client secret back as response 
    // res.send({clientSecret: paymentIntent?.client_secret}) ?? 
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

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => { // receive Stripe server request 
  let event: Stripe.Event; // instantiate mutable variable without a initialization (declare variable to use later)
  try {
    event = verifyStripeWebhook(req, process.env.STRIPE_WEBHOOK_SECRET!); // retrieve Stripe Event object instantiated and returned if the stripe signature and headers were verified
    console.log("Stripe webhook hit");
  } catch (err) {
    console.error('Webhook signature validation failed:', err);
    res.status(400).send('Webhook signature failed');
    return;
  }

  try {
    switch (event.type) { // if valid Stripe Event and event is paymentintent success 
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.log(` PaymentIntent succeeded: ${intent.id}`);
        await processPaymentIntent(intent); // process: insert into db, clear redis cache
        break;
      }

      // if Stripe Event is paymentintent failed 
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.warn(`PaymentIntent failed: ${intent.id}`);
        break;
      }
      default:
        console.log(`Logged event type: ${event.type}`);
    }

    // any other Stripe Event
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

