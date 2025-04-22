import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const userProfiles = pgTable("user-profiles", {
  id: serial("id").primaryKey(),

  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),

  coursesTaken: text("courses_taken"),
  diet: text("diet"),

  yearLevel: text("year_level"),
  major: text("major"),
  specialization: text("specialization"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
