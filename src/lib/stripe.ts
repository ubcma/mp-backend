// src/lib/stripe.ts
import Stripe from "stripe";
//import { redis } from "redis"; // if using Redis for form response persistence
import { Redis } from "ioredis";
require('dotenv').config({ path: ['.env.development.local', '.env'] }) // changed to accept .env.development.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil', // check api version via stripe dashboard 
});

console.log('Loading Stripe with key:', process.env.STRIPE_SECRET_KEY?.slice(0, 10), '...');

import { db } from '../db';
import { eq } from 'drizzle-orm';
import { userProfile } from '../db/schema/userProfile';
import { transaction } from '../db/schema/transaction';


export const redis = new Redis(`${process.env.REDIS_URL}?family=0`)
  .on("error", (err) => {
    console.error("Redis connection error:", err);
  })
  .on("connect", () => {
    console.log("Redis connected");
  })
  .on("ready", () => {
    console.log("Redis ready");
  });


export async function createPaymentIntent(purchaseType:string, userId:string, amount:number, currency:string) {
  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: { purchaseType, userId },
    payment_method_types: ['card'], // Apple Pay routes through 'card', need to check for other automatic methods 
  });

  await redis.set(`pi:${intent.id}`, JSON.stringify({ // IMPORTANT: keep payment id as pid 
  purchaseType,
  userId,
  amount,
  currency,
  eventId: null // or optional if passed
}), 'EX', 3600); // store the intent in redis and make sure that it expires in an hour
  // use the intent id for future transaction identification from frontend 
  await redis.set(`user:${userId}:intent`, intent.id, 'EX', 3600); // default expiry 
  return intent;
}


export const getPaymentIntentForUser = async (userId: string) => {
  const paymentIntentId = await redis.get(`pi:${userId}`);
  if (!paymentIntentId) return null;

  return stripe.paymentIntents.retrieve(paymentIntentId);
  };



export function verifyStripeWebhook(req: any, endpointSecret: string): Stripe.Event {
  const sig = req.headers['stripe-signature']!;
  return stripe.webhooks.constructEvent(
    req.rawBody, // Make sure you're using the raw body here
    sig,
    endpointSecret
  );
}

export async function processPaymentIntent(intent: Stripe.PaymentIntent) {
  const dataStr = await redis.get(`pi:${intent.id}`);
  if (!dataStr) throw new Error(`Missing metadata for PaymentIntent ${intent.id}`);
  const data = JSON.parse(dataStr);

  /*

  const now = new Date(intent.created * 1000);
  const validFrom = now;
  const validUntil =
    data.purchaseType === 'membership'
      ? new Date(now.setMonth(now.getMonth() + 12))
      : new Date(data.eventEnd || now);
  */

  // Change user role to Member (if not already)
  if (data.purchaseType === 'membership') {
    await db
      .update(userProfile)
      .set({
        role: 'Member',
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, data.userId));

    }

  await db.insert(transaction).values({
    userId: data.userId,
    stripe_payment_intent_Id: intent.id,
    purchase_type: data.purchaseType,
    amount: data.amount.toString(),
    currency: data.currency,
    event_id: data.eventId ?? null,
    // valid_from: validFrom,
    // valid_until: validUntil,
    created_at: new Date(),
  });

  

  await redis.del(`pi:${intent.id}`);
}


// Utility function to create a price for a product
export const createPrice = async (productId: string, amount: number, currency: string) => {
  return stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency,
  });
};

// Utility function to create a product
export const createProduct = async (name: string, description: string) => {
  return stripe.products.create({
    name,
    description,
  });
};


// Utility function to retrieve customer
export const getCustomer = async (customerId: string) => {
  return stripe.customers.retrieve(customerId);
};

// Utility function to list all products
export const listProducts = async () => {
  return stripe.products.list();
};

// Utility function to handle refunds
export const createRefund = async (paymentIntentId: string) => {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
};

export default stripe;


/*
// create a paymentmethod for the customer 
export const createPaymentMethod = async (type: string, card: Stripe.PaymentMethodCreateParams.Card1) => {
  return stripe.paymentMethods.create({
    type,
    card,
  });
};
*/



// ARCHIVED CODE 
/*
wrap Redis and Drizzle integration
contain Stripe SDK logic 

create checkout sessions
verify webhooks
save payment data 


export async function createCheckoutSession(purchaseType, userId, eventId?, formResponses?) {
  const lineItem = purchaseType === "membership"
      ? { price: process.env.MEMBERSHIP_PRICE_ID, quantity: 1 }
      : { amount: 'event price', currency: "usd", name: "Event Ticket", quantity: 1 };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [lineItem],
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: { purchaseType, userId, eventId },
  });

    await redis.set(`form:${session.id}`, JSON.stringify({ purchaseType, userId, eventId, formResponses }));
  return session;
}

export function verifyStripeWebhook(req) {
  const sig = req.headers["stripe-signature"];
  return stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
}

export async function processCompletedSession(session) {
  const data = JSON.parse(await redis.get(`form:${session.id}`));
  if (!data) throw new Error("No form data in Redis");
  const { purchaseType, userId, eventId, formResponses } = data;

  if (purchaseType === "membership") {
    // Update user profile, set isPaidMember, set valid dates
    await insertMembershipTransaction({ 'relevant details });
  } else if (purchaseType === "event") {
    // Insert event signup record plus transaction
    await insertEventSignup({ userId, eventId, formResponses, session });
  }

  await redis.del(`form:${session.id}`);
}

export async function createCheckoutSession(userId: string, eventId: string, formResponses: any) {

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "cad",
          product_data: { name: "UBCMA Membership" }, // change to purchase.type eventually 
          unit_amount: 2,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`, // DO WE NEED CHECKOUT ID HERE? 
    metadata: { userId, eventId },
  }); // create the checkout session here (raw logic) 
  // do we need session id in the url? 

  await redis.set(`form:${session.id}`, JSON.stringify({ userId, eventId, formResponses })); // redis only after 
  return session.url!; // need to return clien tsecret? 
}

*/
