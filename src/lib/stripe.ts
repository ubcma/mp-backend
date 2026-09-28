// src/lib/stripe.ts
import Stripe from "stripe";
//import { redis } from "redis"; // if using Redis for form response persistence
import { Redis } from "ioredis";
import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { userProfile } from "../db/schema/userProfile";
import { transaction } from "../db/schema/transaction";
import { event as eventsTable } from "../db/schema/event"; 
import { PAYMENT_EXPIRY } from "./constants";
import { MEMBERSHIP_PRICE  } from "./constants";
import { eventRegistration } from "../db/schema/event";
import { sendReceiptEmail } from "../lib/receipts";

require("dotenv").config({ path: [".env.development.local", ".env"] }); // changed to accept .env.development.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

console.log(
  "Loading Stripe with key:",
  process.env.STRIPE_SECRET_KEY?.slice(0, 10),
  "..."
);

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


const httpError = (status: number, code: string, message?: string) =>
  Object.assign(new Error(message ?? code), { status, code });

export async function createPaymentIntent(
  purchaseType: "membership" | "event",
  userId: string,
  amount: number,
  currency: string,
  eventId?: number            
) {                           

  const [user] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  if (!user) throw httpError(404, "user_not_found");

  const customer = await getOrCreateCustomer(user.email, user.name);


  let finalCurrency = currency || "cad";
  const meta: Record<string, string> = {
    purchaseType,
    userId,
    email: user.email,
  };

  let amountInCents = MEMBERSHIP_PRICE // dummy amount 
  if (purchaseType === "event") {
    if (eventId == null) throw httpError(400, "missing_event_id");

    const [evt] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .limit(1);
    

    if (!evt) throw httpError(404, "event_not_found");
    if (evt.price == null) throw httpError(409, "event_price_missing");
    if (evt.nonMemberPrice == null) throw httpError(409, "event_non_member_price_missing");

    
    amountInCents = user.role === 'Basic' ? Math.round(Number(evt.nonMemberPrice) * 100) : Math.round(Number(evt.price) * 100);
    finalCurrency = "cad"; 
    meta.eventId = String(eventId); //
  } else if (purchaseType === "membership") {
    if (user.role === "Member") throw httpError(409, "already_member");
    amountInCents = amountInCents = MEMBERSHIP_PRICE;
    finalCurrency = "cad";
  } else {
    throw httpError(400, "bad_purchase_type");
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: finalCurrency,
      customer: customer.id,
      metadata: meta,
      automatic_payment_methods: { enabled: true },
    });
  } catch (e: any) {
    console.error("[paymentIntents.create] error", e?.type, e?.code, e?.message);
    throw e;
  }

  // persist correct eventId or null if not 
  await redis.set(
    `pi:${paymentIntent.id}`,
    JSON.stringify({
      purchaseType,
      userId,
      amount: amountInCents,
      currency: finalCurrency,
      eventId: eventId ?? null,
    }),
    "EX",
    PAYMENT_EXPIRY
  );
  await redis.set(`user:${userId}:intent`, paymentIntent.id, "EX", PAYMENT_EXPIRY);

  return paymentIntent;
}

// in case we need the paymentintent again for a certain user
export const getPaymentIntentForUser = async (userId: string) => {
  const paymentIntentId = await redis.get(`user:${userId}:intent`);
  if (!paymentIntentId) return null;
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

export function verifyStripeWebhook(
  req: any,
  endpointSecret: string
): Stripe.Event {
  const sig = req.headers["stripe-signature"]!; // as string
  // let event: Stripe.Event
  // try {event = stripe.webhooks.constructEvent(...)} if you want to set a variable (from video)
  return stripe.webhooks.constructEvent(
    // req.rawbody, (do not use)
    req.body.toString(), // Stripe signs each webhook it sends via the Node SDK with signature header
    sig,
    endpointSecret
  );
} 

/*
This function is called only after the payment has been successfully charged and the webhook is hit with payment_intent.succeeded from SDK
*/
export async function processPaymentIntent(intent: Stripe.PaymentIntent) {
  console.log(`Processing Payment Intent: ${intent.id}`);
  const dataStr = await redis.get(`pi:${intent.id}`);
  if (!dataStr)
    throw new Error(`Missing metadata for PaymentIntent ${intent.id}`);
  const data = JSON.parse(dataStr);


  // Change user role to Member 
  if (data.purchaseType === "membership") {
    await db
      .update(userProfile)
      .set({
        role: "Member",
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, data.userId));
    console.log('Updated Member Profile')
  }

  if (data.purchaseType === "event" && data.eventId) {

  const [result] = await db
    .select({ count: sql<number>`COUNT(${eventRegistration.id})::int` })
    .from(eventRegistration)
    .where(eq(eventRegistration.eventId, Number(data.eventId)));

  const currentCount = result?.count ?? 0;

  const [evt] = await db
    .select({ attendeeCap: eventsTable.attendeeCap })
    .from(eventsTable)
    .where(eq(eventsTable.id, Number(data.eventId)))
    .limit(1);

  const cap = evt?.attendeeCap ?? null;

  if (cap && currentCount >= cap) {
    throw new Error("Event is full");
  }
}

  //Insert into eventRegistration (directly)
  if (data.purchaseType === "event" && data.eventId) {
    await db.insert(eventRegistration).values({
      userId: data.userId,
      eventId: data.eventId,
      stripeTransactionId: intent.id,
    }).onConflictDoNothing({
      target: [eventRegistration.userId, eventRegistration.eventId],
    });
    console.log('Inserted into Event Registration Table')
  }

  await db.insert(transaction).values({
    userId: data.userId,
    stripe_payment_intent_id: intent.id,
    purchase_type: data.purchaseType,
    payment_method_type: intent.payment_method_types?.[0] ?? "card",
    amount: String(intent.amount),
    currency: data.currency,
    event_id: data.eventId ?? null,
    paid_at: new Date(),
    status: 'succeeded'
  }).onConflictDoUpdate({ // in case a pending transaction has been fired before
  target: transaction.stripe_payment_intent_id,
  set: { status: "succeeded", paid_at: new Date() },
  });

  console.log('Inserted into Transaction Table')
  await redis.del(`pi:${intent.id}`);

  // 2) Send the receipt (idempotency card for redis should be in the sendEmail function)
  try {
    await sendReceiptEmail({
      userId: data.userId,
      paymentIntentId: intent.id,
      amountInCents: intent.amount,     // IN CENTS — use Stripe PI (reflects promos)
      currency: data.currency,          // should be cad | usd 
      purchaseType: data.purchaseType,  // "membership" | "event"
      eventId: data.eventId ?? null,
    });
    console.log("Receipt email queued/sent");
  } catch (err) {
    // Do NOT throw or try to regenerate another webhook hit from stripe 
    console.error("[sendReceiptEmail] failed:", err);
  }

  // Clean up the PI metadata key last
  await redis.del(`pi:${intent.id}`);
}



/**
 * Apply a Stripe promotion code to an existing membership PaymentIntent.
 * Enforces an optional time window via MEMBERSHIP_PROMO_WINDOW_START / END (ISO 8601).
 * Optionally restricts to MEMBERSHIP_PROMO_CODE when that env var is set.
 */
export async function applyPromotionCode(
  userId: string,
  paymentIntentId: string,
  code: string
) {
  const trimmedCode = code?.trim();
  if (!paymentIntentId || !trimmedCode) {
    throw httpError(400, "missing_params", "Payment intent and promotion code are required");
  }

  const allowedCode = process.env.MEMBERSHIP_PROMO_CODE?.trim();
  if (allowedCode && trimmedCode.toUpperCase() !== allowedCode.toUpperCase()) {
    throw httpError(400, "invalid_code", "Invalid promotion code");
  }

  const windowStart = process.env.MEMBERSHIP_PROMO_WINDOW_START?.trim();
  const windowEnd = process.env.MEMBERSHIP_PROMO_WINDOW_END?.trim();
  const now = Date.now();

  if (windowStart) {
    const startMs = Date.parse(windowStart);
    if (Number.isNaN(startMs)) {
      throw httpError(500, "bad_promo_config", "Invalid promotion window start");
    }
    if (now < startMs) {
      throw httpError(403, "promo_not_started", "This promotion code is not active yet");
    }
  }

  if (windowEnd) {
    const endMs = Date.parse(windowEnd);
    if (Number.isNaN(endMs)) {
      throw httpError(500, "bad_promo_config", "Invalid promotion window end");
    }
    if (now > endMs) {
      throw httpError(403, "promo_expired", "This promotion code has expired");
    }
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.userId !== userId) {
    throw httpError(403, "forbidden", "Payment intent does not belong to this user");
  }
  if (paymentIntent.metadata?.purchaseType !== "membership") {
    throw httpError(400, "not_membership", "Promotion codes are only valid for membership purchases");
  }

  const updatable = ["requires_payment_method", "requires_confirmation", "requires_action"];
  if (!updatable.includes(paymentIntent.status)) {
    throw httpError(409, "intent_not_updatable", "This payment can no longer be updated");
  }

  // Already applied this code — idempotent
  if (
    paymentIntent.metadata?.promotionCode &&
    paymentIntent.metadata.promotionCode.toUpperCase() === trimmedCode.toUpperCase()
  ) {
    return {
      paymentIntent,
      amount: paymentIntent.amount,
      originalAmount: Number(paymentIntent.metadata.originalAmount) || MEMBERSHIP_PRICE,
      promotionCode: paymentIntent.metadata.promotionCode,
    };
  }

  // Stripe promotion code matching is case-sensitive
  const codesToTry = Array.from(
    new Set(
      [trimmedCode, trimmedCode.toUpperCase(), allowedCode].filter(
        (c): c is string => Boolean(c)
      )
    )
  );

  let promotionCode: Stripe.PromotionCode | undefined;
  for (const tryCode of codesToTry) {
    const promoList = await stripe.promotionCodes.list({
      code: tryCode,
      active: true,
      limit: 1,
    });
    if (promoList.data[0]) {
      promotionCode = promoList.data[0];
      break;
    }
  }

  if (!promotionCode) {
    throw httpError(400, "invalid_code", "Invalid or inactive promotion code");
  }

  const couponId =
    typeof promotionCode.coupon === "string"
      ? promotionCode.coupon
      : promotionCode.coupon.id;
  const coupon = await stripe.coupons.retrieve(couponId);

  if (!coupon.valid) {
    throw httpError(400, "invalid_coupon", "This promotion is no longer valid");
  }

  const originalAmount = MEMBERSHIP_PRICE;
  let discountedAmount = originalAmount;

  if (coupon.percent_off != null) {
    discountedAmount = Math.round(originalAmount * (1 - coupon.percent_off / 100));
  } else if (coupon.amount_off != null) {
    // amount_off is in the coupon's currency's smallest unit
    discountedAmount = Math.max(0, originalAmount - coupon.amount_off);
  } else {
    throw httpError(400, "unsupported_coupon", "Coupon has no discount configured");
  }

  if (discountedAmount <= 0) {
    throw httpError(400, "invalid_discount", "Discounted amount must be greater than zero");
  }
  if (discountedAmount === originalAmount) {
    throw httpError(400, "no_discount", "Promotion code does not change the price");
  }

  const updated = await stripe.paymentIntents.update(paymentIntentId, {
    amount: discountedAmount,
    metadata: {
      ...paymentIntent.metadata,
      promotionCode: trimmedCode.toUpperCase(),
      promotionCodeId: promotionCode.id,
      originalAmount: String(originalAmount),
    },
  });

  const dataStr = await redis.get(`pi:${paymentIntentId}`);
  if (dataStr) {
    const data = JSON.parse(dataStr);
    data.amount = discountedAmount;
    data.promotionCode = trimmedCode.toUpperCase();
    data.originalAmount = originalAmount;
    await redis.set(
      `pi:${paymentIntentId}`,
      JSON.stringify(data),
      "EX",
      PAYMENT_EXPIRY
    );
  }

  return {
    paymentIntent: updated,
    amount: discountedAmount,
    originalAmount,
    promotionCode: trimmedCode.toUpperCase(),
    percentOff: coupon.percent_off ?? null,
    amountOff: coupon.amount_off ?? null,
  };
}

// Utility function to create a price for a product
export const createPrice = async (
  productId: string,
  amount: number,
  currency: string
) => {
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
async function getOrCreateCustomer(email: string, name?: string) {
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  return await stripe.customers.create({
    email,
    name
  });
}

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

