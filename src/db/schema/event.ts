import {
  pgTable,
  bigint,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const questionTypeEnum = pgEnum("question_type", [
  "ShortText",
  "LongText",
  "Email",
  "Number",
  "Date",
  "Time",
  "Radio",
  "Select",
  "Checkbox",
  "YesNo",
  "FileUpload",
]);

export const tag = pgTable("tag", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull()
  .default(sql`DEFAULT`),
  name: text("name").unique().notNull(),
});

export const event = pgTable("event", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull()
  .default(sql`DEFAULT`),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  slug: text("slug").notNull(),
  price: integer("price"),
  isVisible: boolean("is_visible"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const eventTag = pgTable(
  "event_tag",
  {
    eventId: bigint("event_id", { mode: "number" })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    tagId: bigint("tag_id", { mode: "number" })
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.tagId] })]
);

export const eventSignup = pgTable("event_signup", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull()
  .default(sql`DEFAULT`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventId: bigint("event_id", { mode: "number" })
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
  stripeTransactionId: text("stripe_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const question = pgTable("question", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull()
  .default(sql`DEFAULT`),
  eventId: bigint("event_id", { mode: "number" })
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  placeholder: text("placeholder"),
  type: questionTypeEnum("type").notNull(),
  isRequired: boolean("is_required").notNull(),
  sortOrder: integer("sort_order").notNull(),
  options: text("options").array(),
  validation: jsonb("validation")
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const eventSignupResponse = pgTable("event_signup_response", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull()
  .default(sql`DEFAULT`),
  signupId: bigint("signup_id", { mode: "number" })
    .notNull()
    .references(() => eventSignup.id, { onDelete: "cascade" }),
  questionId: bigint("question_id", { mode: "number" })
    .notNull()
    .references(() => question.id, { onDelete: "cascade" }),
  response: text("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
