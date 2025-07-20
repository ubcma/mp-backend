import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  bigint,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["Guest", "Basic", "Member", "Admin"]); // add userRole Basic to userRole based on updated user types 

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const userProfile = pgTable("user_profile", {
  id: bigint("id", { mode: "number" })
    .primaryKey()
    .notNull()
    .default(sql`DEFAULT`),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  year: text("year"),
  faculty: text("faculty"),
  major: text("major"),
  linkedinUrl: text("linkedin_url"),
  interests: text("interests").array(),
  diet: text("diet").array(),
  onboardingComplete: boolean("onboarding_complete").default(false),
  role: userRoleEnum("role").notNull().default("Member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
