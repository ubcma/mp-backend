import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const transaction = pgTable('transaction', {
  transaction_id: serial('transaction_id').primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // do we want to delete user transactions if user is deleted? 
  stripe_payment_intent_id: text('stripe_payment_intent_id').notNull().unique(), // insetad of checkout use the paymentIntent object from pid via redis 
  purchase_type: text('purchase_type').notNull(),  // 'membership' or 'event'
  payment_method_type: text('payment_method_type'), // e.g., 'card' 
  amount: text('amount').notNull(),
  currency: text('currency').notNull(),
  event_id: text('event_id'),
  paid_at: timestamp('paid_at').notNull().defaultNow(),
  status: text("status").notNull().default("pending"), 
});

