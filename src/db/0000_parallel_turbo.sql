-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."application_method_type" AS ENUM('external', 'email', 'instructions');--> statement-breakpoint
CREATE TYPE "public"."checked_in_status" AS ENUM('checkedIn', 'registered', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'contract', 'internship');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('ShortText', 'LongText', 'Email', 'Number', 'Date', 'Time', 'Radio', 'Select', 'Checkbox', 'YesNo', 'FileUpload');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('incomplete', 'registered', 'checkedIn');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Guest', 'Member', 'Admin', 'Basic');--> statement-breakpoint
CREATE TABLE "transaction" (
	"transaction_id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"stripe_payment_intent_id" text NOT NULL,
	"purchase_type" text NOT NULL,
	"payment_method_type" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"event_id" text,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "uniq_txn_pi" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company_name" text NOT NULL,
	"description" text NOT NULL,
	"type" "job_type" NOT NULL,
	"application_type" "application_method_type" NOT NULL,
	"application_url" text,
	"application_email" text,
	"application_text" text,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"location" text NOT NULL,
	"company_logo" text,
	CONSTRAINT "jobs_check" CHECK (((application_type = 'external'::application_method_type) AND (application_url IS NOT NULL) AND (application_email IS NULL) AND (application_text IS NULL)) OR ((application_type = 'email'::application_method_type) AND (application_email IS NOT NULL) AND (application_url IS NULL) AND (application_text IS NULL)) OR ((application_type = 'instructions'::application_method_type) AND (application_text IS NOT NULL) AND (application_url IS NULL) AND (application_email IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_profile_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"avatar" text,
	"year" text,
	"faculty" text,
	"major" text,
	"linkedin_url" text,
	"interests" text[],
	"diet" text[],
	"onboarding_complete" boolean DEFAULT false,
	"role" "user_role" DEFAULT 'Basic' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "unique_user_profile_user_id" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp with time zone,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_provider" UNIQUE("userId","providerId")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tag_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "tag_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_registration_response" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_signup_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"signup_id" bigint NOT NULL,
	"question_id" bigint NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_registration_response" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "question" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" bigint NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"type" "question_type" NOT NULL,
	"is_required" boolean NOT NULL,
	"sort_order" integer NOT NULL,
	"options" text[],
	"validation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_event_question_label" UNIQUE("event_id","label"),
	CONSTRAINT "unique_event_sort_order" UNIQUE("event_id","sort_order"),
	CONSTRAINT "options_required_for_select" CHECK (((type = ANY (ARRAY['Select'::question_type, 'Radio'::question_type, 'Checkbox'::question_type])) AND (options IS NOT NULL)) OR ((type <> ALL (ARRAY['Select'::question_type, 'Radio'::question_type, 'Checkbox'::question_type])) AND (options IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price" numeric,
	"description" text,
	"image_url" text,
	"is_visible" boolean DEFAULT true,
	"members_only" boolean DEFAULT true NOT NULL,
	"attendee_cap" integer,
	"pricing_tier" text DEFAULT 'Regular',
	CONSTRAINT "unique_event_title_date" UNIQUE("starts_at","title")
);
--> statement-breakpoint
CREATE TABLE "event_registration" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_signup_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"event_id" bigint NOT NULL,
	"stripe_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "checked_in_status" DEFAULT 'registered' NOT NULL,
	"ticket_code" text,
	"checked_in_at" timestamp with time zone,
	CONSTRAINT "unique_user_event_signup" UNIQUE("user_id","event_id"),
	CONSTRAINT "event_registration_ticket_code_key" UNIQUE("ticket_code")
);
--> statement-breakpoint
ALTER TABLE "event_registration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_tag" (
	"tag_id" bigint NOT NULL,
	"event_id" bigint NOT NULL,
	CONSTRAINT "event_tag_pkey" PRIMARY KEY("tag_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration_response" ADD CONSTRAINT "event_signup_response_signup_id_fkey" FOREIGN KEY ("signup_id") REFERENCES "public"."event_registration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration_response" ADD CONSTRAINT "event_signup_response_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_signup_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_signup_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tag" ADD CONSTRAINT "event_id" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tag" ADD CONSTRAINT "tag_id" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "select_own_profile" ON "user_profile" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = current_setting('app.current_user_id'::text)));--> statement-breakpoint
CREATE POLICY "admin_all_profiles" ON "user_profile" AS PERMISSIVE FOR SELECT TO "admin";--> statement-breakpoint
CREATE POLICY "select_own_responses" ON "event_registration_response" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((signup_id IN ( SELECT event_registration.id
   FROM event_registration
  WHERE (event_registration.user_id = current_setting('app.current_user_id'::text)))));--> statement-breakpoint
CREATE POLICY "admin_all_responses" ON "event_registration_response" AS PERMISSIVE FOR SELECT TO "admin";--> statement-breakpoint
CREATE POLICY "insert_own_signups" ON "event_registration" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = current_setting('app.current_user_id'::text)));--> statement-breakpoint
CREATE POLICY "select_own_signups" ON "event_registration" AS PERMISSIVE FOR SELECT TO "authenticated";
*/