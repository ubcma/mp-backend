import { pgTable, uuid, text, decimal, date, time, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  date: date('date'),
  time: time('time'),
  tags: text('tags').array(),
  description: text('description'),
  imageUrl: text('image_url'),
  stripeLink: text('stripe_link'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const eventQuestions = pgTable('event_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type'),
  required: boolean('required').default(false),
  sortOrder: integer('sort_order'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const signups = pgTable('signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  attendeeEmail: text('attendee_email').notNull(),
  stripePaymentId: text('stripe_payment_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const signupAnswers = pgTable('signup_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  signupId: uuid('signup_id').references(() => signups.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').references(() => eventQuestions.id, { onDelete: 'cascade' }),
  answer: text('answer'),
  createdAt: timestamp('created_at').defaultNow(),
});
