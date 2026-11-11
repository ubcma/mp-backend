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
import { MEMBERSHIP_PRICE, STRIPE_MIN_CHARGE_CENTS } from "./constants";
import { eventRegistration } from "../db/schema/event";
import { sendReceiptEmail } from "../lib/receipts";
import { httpError } from "./utils";
import { assertOnboardingComplete, requiresOnboarding } from "./registrationChecks";

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
    if (requiresOnboarding(evt)) {
      assertOnboardingComplete(user);
    }

    
    amountInCents = user.role === 'Basic' ? Math.round(Number(evt.nonMemberPrice) * 100) : Math.round(Number(evt.price) * 100);
    finalCurrency = "cad"; 
    meta.eventId = String(eventId); //
    meta.eventSlug = evt.slug;
  } else if (purchaseType === "membership") {
    if (user.role === "Member") throw httpError(409, "already_member");
    amountInCents = amountInCents = MEMBERSHIP_PRICE;
    finalCurrency = "cad";
  } else {
    throw httpError(400, "bad_purchase_type");
  }
  meta.originalAmount = String(amountInCents);

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
 * Enforces MEMBERSHIP_PROMO_CODE and the MEMBERSHIP_PROMO_WINDOW_START / END (ISO 8601) window when set.
 */
function assertMembershipPromoConfig(code: string, allowedCode: string | undefined) {
  if (allowedCode && code.toUpperCase() !== allowedCode.toUpperCase()) {
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
}

/**
 * Scoping is read from `purchaseType` / `eventSlug` metadata on the Stripe promotion code,
 * falling back to its coupon's metadata:
 * - membership: codes with no `purchaseType`, or `purchaseType=membership`
 * - event: codes must have `purchaseType=event`; an optional comma-separated `eventSlug`
 *   limits the code to those events
 */
function assertPromoScope(
  scope: Stripe.Metadata,
  purchaseType: "membership" | "event",
  eventSlug: string | undefined
) {
  const codeType = scope.purchaseType?.trim().toLowerCase();

  if (purchaseType === "membership") {
    if (codeType && codeType !== "membership") {
      throw httpError(400, "promo_wrong_purchase_type", "This promotion code is not valid for memberships");
    }
    return;
  }

  if (codeType !== "event") {
    throw httpError(400, "promo_wrong_purchase_type", "This promotion code is not valid for events");
  }

  const allowedSlugs = (scope.eventSlug ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowedSlugs.length > 0 && !allowedSlugs.includes(eventSlug?.toLowerCase() ?? "")) {
    throw httpError(400, "promo_wrong_event", "This promotion code is not valid for this event");
  }
}

async function getPromotableIntent(userId: string, paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.userId !== userId) {
    throw httpError(403, "forbidden", "Payment intent does not belong to this user");
  }

  const purchaseType = paymentIntent.metadata?.purchaseType;
  if (purchaseType !== "membership" && purchaseType !== "event") {
    throw httpError(400, "bad_purchase_type", "Promotion codes are not valid for this purchase");
  }
  const promotableType: "membership" | "event" = purchaseType;

  const updatable = ["requires_payment_method", "requires_confirmation", "requires_action"];
  if (!updatable.includes(paymentIntent.status)) {
    throw httpError(409, "intent_not_updatable", "This payment can no longer be updated");
  }

  // Intents created before originalAmount was stored still hold the undiscounted amount
  // unless a code was applied, which also writes originalAmount.
  const originalAmount =
    Number(paymentIntent.metadata.originalAmount) ||
    (purchaseType === "membership" ? MEMBERSHIP_PRICE : paymentIntent.amount);

  return { paymentIntent, purchaseType: promotableType, originalAmount };
}

/**
 * Looks up an active promotion code, checks its scope, and returns the discounted amount (may be 0).
 */
async function resolvePromotion(
  code: string,
  allowedCode: string | undefined,
  purchaseType: "membership" | "event",
  paymentIntent: Stripe.PaymentIntent,
  originalAmount: number
) {
  // Stripe promotion code matching is case-sensitive
  const codesToTry = Array.from(
    new Set(
      [code, code.toUpperCase(), allowedCode].filter(
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

  assertPromoScope(
    { ...(coupon.metadata ?? {}), ...(promotionCode.metadata ?? {}) },
    purchaseType,
    paymentIntent.metadata.eventSlug
  );

  let discountedAmount = originalAmount;

  if (coupon.percent_off != null) {
    discountedAmount = Math.round(originalAmount * (1 - coupon.percent_off / 100));
  } else if (coupon.amount_off != null) {
    // amount_off is in the coupon's currency's smallest unit
    discountedAmount = Math.max(0, originalAmount - coupon.amount_off);
  } else {
    throw httpError(400, "unsupported_coupon", "Coupon has no discount configured");
  }

  if (discountedAmount === originalAmount) {
    throw httpError(400, "no_discount", "Promotion code does not change the price");
  }

  return { promotionCode, coupon, discountedAmount };
}

/**
 * Apply a Stripe promotion code to an existing membership or event PaymentIntent.
 * Event codes that bring the price to $0 return `free: true` without touching the PaymentIntent;
 * the client then registers through the free-redemption endpoint.
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

  const { paymentIntent, purchaseType, originalAmount } = await getPromotableIntent(
    userId,
    paymentIntentId
  );

  const allowedCode =
    purchaseType === "membership" ? process.env.MEMBERSHIP_PROMO_CODE?.trim() : undefined;
  if (purchaseType === "membership") {
    assertMembershipPromoConfig(trimmedCode, allowedCode);
  }

  // Already applied this code — idempotent
  if (
    paymentIntent.metadata?.promotionCode &&
    paymentIntent.metadata.promotionCode.toUpperCase() === trimmedCode.toUpperCase()
  ) {
    return {
      paymentIntent,
      amount: paymentIntent.amount,
      originalAmount,
      promotionCode: paymentIntent.metadata.promotionCode,
      percentOff: null,
      amountOff: null,
      free: false,
    };
  }

  const { promotionCode, coupon, discountedAmount } = await resolvePromotion(
    trimmedCode,
    allowedCode,
    purchaseType,
    paymentIntent,
    originalAmount
  );

  const discount = {
    originalAmount,
    promotionCode: trimmedCode.toUpperCase(),
    percentOff: coupon.percent_off ?? null,
    amountOff: coupon.amount_off ?? null,
  };

  if (discountedAmount <= 0) {
    if (purchaseType !== "event") {
      throw httpError(400, "invalid_discount", "Discounted amount must be greater than zero");
    }
    return { paymentIntent, amount: 0, free: true, ...discount };
  }
  if (discountedAmount < STRIPE_MIN_CHARGE_CENTS) {
    throw httpError(
      400,
      "below_minimum_charge",
      `The discounted price must be at least $${(STRIPE_MIN_CHARGE_CENTS / 100).toFixed(2)}`
    );
  }

  const updated = await stripe.paymentIntents.update(paymentIntentId, {
    amount: discountedAmount,
    metadata: {
      ...paymentIntent.metadata,
      promotionCode: discount.promotionCode,
      promotionCodeId: promotionCode.id,
      originalAmount: String(originalAmount),
    },
  });

  const dataStr = await redis.get(`pi:${paymentIntentId}`);
  if (dataStr) {
    const data = JSON.parse(dataStr);
    data.amount = discountedAmount;
    data.promotionCode = discount.promotionCode;
    data.originalAmount = originalAmount;
    await redis.set(
      `pi:${paymentIntentId}`,
      JSON.stringify(data),
      "EX",
      PAYMENT_EXPIRY
    );
  }

  return { paymentIntent: updated, amount: discountedAmount, free: false, ...discount };
}

export type FreeEventPromotion = Awaited<ReturnType<typeof verifyFreeEventPromotion>>;

/**
 * Verifies that `code` discounts this event PaymentIntent to $0. Register the user only after
 * this resolves, then call recordFreeEventRedemption.
 */
export async function verifyFreeEventPromotion(
  userId: string,
  eventId: number,
  paymentIntentId: string,
  code: string
) {
  const trimmedCode = code?.trim();
  if (!paymentIntentId || !trimmedCode) {
    throw httpError(400, "missing_params", "Payment intent and promotion code are required");
  }

  const { paymentIntent, purchaseType, originalAmount } = await getPromotableIntent(
    userId,
    paymentIntentId
  );
  if (purchaseType !== "event" || paymentIntent.metadata.eventId !== String(eventId)) {
    throw httpError(400, "intent_event_mismatch", "This payment is not for this event");
  }

  const { promotionCode, discountedAmount } = await resolvePromotion(
    trimmedCode,
    undefined,
    purchaseType,
    paymentIntent,
    originalAmount
  );
  if (discountedAmount > 0) {
    throw httpError(400, "promo_not_free", "This promotion code does not make this event free");
  }

  return {
    userId,
    eventId,
    paymentIntent,
    promotionCode,
    code: trimmedCode.toUpperCase(),
    originalAmount,
  };
}

/**
 * Records a $0 transaction for a free promotion redemption and cancels the unused PaymentIntent.
 */
export async function recordFreeEventRedemption(promo: FreeEventPromotion) {
  const { userId, eventId, paymentIntent, promotionCode, code, originalAmount } = promo;

  await db
    .insert(transaction)
    .values({
      userId,
      stripe_payment_intent_id: paymentIntent.id,
      purchase_type: "event",
      payment_method_type: "promotion_code",
      amount: "0",
      currency: paymentIntent.currency,
      event_id: String(eventId),
      paid_at: new Date(),
      status: "succeeded",
    })
    .onConflictDoNothing({ target: transaction.stripe_payment_intent_id });

  // The user is already registered at this point, so cleanup failures are logged, not thrown.
  try {
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        ...paymentIntent.metadata,
        promotionCode: code,
        promotionCodeId: promotionCode.id,
        originalAmount: String(originalAmount),
        freeRedemption: "true",
      },
    });
    await stripe.paymentIntents.cancel(paymentIntent.id);
  } catch (err) {
    console.error("[recordFreeEventRedemption] failed to cancel PaymentIntent", paymentIntent.id, err);
  }
  await redis.del(`pi:${paymentIntent.id}`, `user:${userId}:intent`);
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

