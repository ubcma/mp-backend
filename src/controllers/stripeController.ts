// control database logic for purchase 

// we have purchases, but could be event or a membership
// need to include the appropriate response 

// frontend request forwarded from route 
// frontend response - send back payment intent client secret the url and success to the frontend for api 

// we should use helpers from lib/stripe.ts to interact with stripe sdk and db, keep it sanitary here (all raw logic should be in library folder)

import { Request, Response, RequestHandler } from "express";
import stripe, {verifyStripeWebhook, 
        createPaymentIntent, 
        getPaymentIntentForUser,
        processPaymentIntent} from "../lib/stripe"
import { db } from "../db";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import Stripe from 'stripe';

require('dotenv').config({ path: ['.env.development.local', '.env'] })

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

    const { purchaseType, amount, currency = 'cad', eventId } = req.body;// pass the request body into the helper function for creation of paymentintent
    const paymentIntent = await createPaymentIntent(
      purchaseType as 'membership' | 'event',
      userId,
      amount,     // ignored for events
      currency,
      eventId     
    );

 // taken from the  library
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id,  metadata:paymentIntent.metadata}); // send client secret back as response 

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
    switch (event.type) {
  case 'payment_intent.succeeded': {
    const intent = event.data.object as Stripe.PaymentIntent;
    await processPaymentIntent(intent);
    break;
    }
    default:
      console.log(`Logged event type: ${event.type}`); // no DB writes here
  }


    // any other Stripe Event
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Webhook processing error');
  }
};

export async function handleVerifyPayment(req: Request, res: Response) {
  const headers = new Headers();

  if (req.headers.cookie) {
    headers.append('cookie', req.headers.cookie);
  }

  try {

    console.log("handling the verification of payment");

    const { payment_intent } = req.query as { payment_intent: string };
    const session = await auth.api.getSession({ headers });

    const user = session?.user;
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!payment_intent) {
      return res.status(400).json({ verified: false });
    }

    const pi = await stripe.paymentIntents.retrieve(payment_intent);

    if (pi.status === "succeeded") {
      return res.json({ verified: true, paymentIntent: pi });
    } else {
      return res.json({ verified: false, paymentIntent: pi });
    }
  } catch (err) {
    console.error("Error verifying PaymentIntent:", err);
    res.status(500).json({ error: "Failed to verify PaymentIntent" });
  }
}