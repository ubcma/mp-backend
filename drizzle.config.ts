import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL environment variable is not set.');

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: { url: dbUrl },
  schema: './src/db/schema.ts',
  out: "./src/db",
});