import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  year: text('year').notNull(),
  faculty: text('faculty').notNull(),
  major: text('major').notNull(),
});