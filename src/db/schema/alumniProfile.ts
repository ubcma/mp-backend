import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Alumni profile for referral opt-in contacts
export const alumniProfiles = pgTable("alumni_profiles", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  fullName: text("full_name").notNull(),

  currentCompany: text("current_company").notNull(),
  currentTitle: text("current_title"),
  graduationYear: text("graduation_year"),

  linkedinUrl: text("linkedin_url"),
  contactEmail: text("contact_email"),

  // Opt-in for being listed as a referral contact
  referralOptIn: boolean("referral_opt_in").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Join table for alumni with multiple company affiliations (future-proofing)
export const alumniCompanies = pgTable("alumni_companies", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  alumniProfileId: uuid("alumni_profile_id")
    .notNull()
    .references(() => alumniProfiles.id, { onDelete: "cascade" }),

  companyName: text("company_name").notNull(),
  isCurrent: boolean("is_current").notNull().default(true),
  referralOptIn: boolean("referral_opt_in").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Type exports for use in controllers
export type AlumniProfile = typeof alumniProfiles.$inferSelect;
export type NewAlumniProfile = typeof alumniProfiles.$inferInsert;
export type AlumniCompany = typeof alumniCompanies.$inferSelect;
export type NewAlumniCompany = typeof alumniCompanies.$inferInsert;
