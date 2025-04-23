// Run Command: ts-node drizzle/seed.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { eventQuestions, events } from '../db/schema/events';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(client);

async function main() {
  await client.connect();

  const insertedEvents = await db.insert(events).values([
    {
      title: 'Tech Conference 2025',
      price: '49.99',
      date: '2025-08-12',
      time: '09:00',
      tags: ['tech', 'networking'],
      description: 'A conference for tech enthusiasts.',
      imageUrl: 'https://example.com/techconf.jpg',
      stripeLink: 'https://buy.stripe.com/testcheckoutlink1',
    },
    {
      title: 'Startup Pitch Night',
      price: '0.00',
      date: '2025-07-05',
      time: '18:30',
      tags: ['startup', 'pitch'],
      description: 'Pitch your startup idea to investors!',
      imageUrl: 'https://example.com/startuppitch.jpg',
      stripeLink: 'https://buy.stripe.com/testcheckoutlink2',
    },
    {
      title: 'Hackathon Weekend',
      price: '19.99',
      date: '2025-09-20',
      time: '10:00',
      tags: ['hackathon', 'competition'],
      description: 'A full weekend hackathon event.',
      imageUrl: 'https://example.com/hackathon.jpg',
      stripeLink: 'https://buy.stripe.com/testcheckoutlink3',
    },
  ]).returning({ id: events.id });

  const confId = insertedEvents[0].id;
  const pitchNightId = insertedEvents[1].id;
  const hackathonId = insertedEvents[2].id;

  await db.insert(eventQuestions).values([
    {
      eventId: confId,
      questionText: 'What is your current role?',
      questionType: 'text',
      required: true,
      sortOrder: 1,
    },
    {
      eventId: confId,
      questionText: 'Do you have any dietary restrictions?',
      questionType: 'text',
      required: false,
      sortOrder: 2,
    },
    {
      eventId: pitchNightId,
      questionText: 'What is the name of your startup?',
      questionType: 'text',
      required: true,
      sortOrder: 1,
    },
    {
      eventId: pitchNightId,
      questionText: 'Are you looking for funding?',
      questionType: 'boolean',
      required: true,
      sortOrder: 2,
    },
    {
      eventId: hackathonId,
      questionText: 'What programming languages do you use?',
      questionType: 'text',
      required: true,
      sortOrder: 1,
    },
    {
      eventId: hackathonId,
      questionText: 'Do you need a team?',
      questionType: 'boolean',
      required: false,
      sortOrder: 2,
    },
  ]);

  console.log('✅ Seed completed successfully!');
  await client.end();
}

main().catch((err) => {
  console.error('❌ Error seeding database:', err);
  process.exit(1);
});
