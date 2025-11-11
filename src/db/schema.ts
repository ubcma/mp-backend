import { pgTable, unique, serial, text, timestamp, boolean, check, uuid, foreignKey, pgPolicy, bigint, integer, jsonb, numeric, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const applicationMethodType = pgEnum("application_method_type", ['external', 'email', 'instructions'])
export const checkedInStatus = pgEnum("checked_in_status", ['checkedIn', 'registered', 'incomplete'])
export const jobType = pgEnum("job_type", ['full_time', 'part_time', 'contract', 'internship'])
export const questionType = pgEnum("question_type", ['ShortText', 'LongText', 'Email', 'Number', 'Date', 'Time', 'Radio', 'Select', 'Checkbox', 'YesNo', 'FileUpload'])
export const registrationStatus = pgEnum("registration_status", ['incomplete', 'registered', 'checkedIn'])
export const userRole = pgEnum("user_role", ['Guest', 'Member', 'Admin', 'Basic'])


export const transaction = pgTable("transaction", {
	transactionId: serial("transaction_id").primaryKey().notNull(),
	userId: text("user_id"),
	stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
	purchaseType: text("purchase_type").notNull(),
	paymentMethodType: text("payment_method_type").notNull(),
	amount: text().notNull(),
	currency: text().notNull(),
	eventId: text("event_id"),
	paidAt: timestamp("paid_at", { mode: 'date' }).defaultNow().notNull(),
	status: text().default('pending').notNull(),
}, (table) => [
	unique("uniq_txn_pi").on(table.stripePaymentIntentId),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: boolean().default(false),
	image: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_key").on(table.email),
]);

export const jobs = pgTable("jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	companyName: text("company_name").notNull(),
	description: text().notNull(),
	type: jobType().notNull(),
	applicationType: applicationMethodType("application_type").notNull(),
	applicationUrl: text("application_url"),
	applicationEmail: text("application_email"),
	applicationText: text("application_text"),
	postedAt: timestamp("posted_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	location: text().notNull(),
	companyLogo: text("company_logo"),
}, (table) => [
	check("jobs_check", sql`((application_type = 'external'::application_method_type) AND (application_url IS NOT NULL) AND (application_email IS NULL) AND (application_text IS NULL)) OR ((application_type = 'email'::application_method_type) AND (application_email IS NOT NULL) AND (application_url IS NULL) AND (application_text IS NULL)) OR ((application_type = 'instructions'::application_method_type) AND (application_text IS NOT NULL) AND (application_url IS NULL) AND (application_email IS NULL))`),
]);

export const userProfile = pgTable("user_profile", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "user_profile_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	bio: text(),
	avatar: text(),
	year: text(),
	faculty: text(),
	major: text(),
	linkedinUrl: text("linkedin_url"),
	interests: text().array(),
	diet: text().array(),
	onboardingComplete: boolean("onboarding_complete").default(false),
	role: userRole().default('Basic').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	email: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_profile_user_id_fkey"
		}).onDelete("cascade"),
	unique("unique_user_profile_user_id").on(table.userId),
	pgPolicy("select_own_profile", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = current_setting('app.current_user_id'::text))` }),
	pgPolicy("admin_all_profiles", { as: "permissive", for: "select", to: ["admin"] }),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	token: text().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onDelete("cascade"),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	accessTokenExpiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	refreshTokenExpiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	scope: text(),
	idToken: text(),
	password: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onDelete("cascade"),
	unique("unique_user_provider").on(table.userId, table.providerId),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const tag = pgTable("tag", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "tag_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: text().notNull(),
}, (table) => [
	unique("tag_name_key").on(table.name),
]);

export const eventRegistrationResponse = pgTable("event_registration_response", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "event_signup_response_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	signupId: bigint("signup_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	questionId: bigint("question_id", { mode: "number" }).notNull(),
	response: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.signupId],
			foreignColumns: [eventRegistration.id],
			name: "event_signup_response_signup_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.questionId],
			foreignColumns: [question.id],
			name: "event_signup_response_question_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("select_own_responses", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(signup_id IN ( SELECT event_registration.id
   FROM event_registration
  WHERE (event_registration.user_id = current_setting('app.current_user_id'::text))))` }),
	pgPolicy("admin_all_responses", { as: "permissive", for: "select", to: ["admin"] }),
]);

export const question = pgTable("question", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "question_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	eventId: bigint("event_id", { mode: "number" }).notNull(),
	label: text().notNull(),
	placeholder: text(),
	type: questionType().notNull(),
	isRequired: boolean("is_required").notNull(),
	sortOrder: integer("sort_order").notNull(),
	options: text().array(),
	validation: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [event.id],
			name: "question_event_id_fkey"
		}).onDelete("cascade"),
	unique("unique_event_question_label").on(table.eventId, table.label),
	unique("unique_event_sort_order").on(table.eventId, table.sortOrder),
	check("options_required_for_select", sql`((type = ANY (ARRAY['Select'::question_type, 'Radio'::question_type, 'Checkbox'::question_type])) AND (options IS NOT NULL)) OR ((type <> ALL (ARRAY['Select'::question_type, 'Radio'::question_type, 'Checkbox'::question_type])) AND (options IS NULL))`),
]);

export const event = pgTable("event", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "event_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'date' }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'date' }).notNull(),
	location: text().notNull(),
	title: text().notNull(),
	slug: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	price: numeric('price', { mode: 'number' }),
	description: text(),
	imageUrl: text("image_url"),
	isVisible: boolean("is_visible").default(true),
	membersOnly: boolean("members_only").default(true).notNull(),
	attendeeCap: integer("attendee_cap"),
	pricingTier: text("pricing_tier").default('Regular'),
}, (table) => [
	unique("unique_event_title_date").on(table.startsAt, table.title),
]);

export const eventRegistration = pgTable("event_registration", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "event_signup_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	userId: text("user_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	eventId: bigint("event_id", { mode: "number" }).notNull(),
	stripeTransactionId: text("stripe_transaction_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	status: checkedInStatus().default('registered').notNull(),
	ticketCode: text("ticket_code"),
	checkedInAt: timestamp("checked_in_at", { withTimezone: true, mode: 'date' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "event_signup_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [event.id],
			name: "event_signup_event_id_fkey"
		}).onDelete("cascade"),
	unique("unique_user_event_signup").on(table.userId, table.eventId),
	unique("event_registration_ticket_code_key").on(table.ticketCode),
	pgPolicy("insert_own_signups", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(user_id = current_setting('app.current_user_id'::text))`  }),
	pgPolicy("select_own_signups", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const eventTag = pgTable("event_tag", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tagId: bigint("tag_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	eventId: bigint("event_id", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [event.id],
			name: "event_id"
		}),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tag.id],
			name: "tag_id"
		}),
	primaryKey({ columns: [table.tagId, table.eventId], name: "event_tag_pkey"}),
]);
