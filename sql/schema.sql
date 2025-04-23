CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price DECIMAL(10,2),
  date DATE,
  time TIME,
  tags TEXT[],
  description TEXT,
  image_url TEXT,
  stripe_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT,
  required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  attendee_email TEXT NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE signup_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id UUID REFERENCES signups(id) ON DELETE CASCADE,
  question_id UUID REFERENCES event_questions(id) ON DELETE CASCADE,
  answer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
