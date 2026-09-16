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
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const jobTypeEnum = pgEnum("job_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
]);

export const applicationMethodEnum = pgEnum("application_method_type", [
  "external",
  "email",
  "instructions",
]);

export const jobs = pgTable("jobs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  title: text("title").notNull(),
  companyName: text("company_name").notNull(),
  companyLogo: text("company_logo"),
  location: text("location"),

  description: text("description").notNull(),

  type: jobTypeEnum("type").notNull(),

  applicationType: applicationMethodEnum("application_type").notNull(),
  applicationUrl: text("application_url"),
  applicationEmail: text("application_email"),
  applicationText: text("application_text"),

  postedAt: timestamp("posted_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  isActive: boolean("is_active").notNull().default(true),
});
