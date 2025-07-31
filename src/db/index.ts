import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as auth from './schema/auth';
import * as transactionSchema from './schema/transaction';
//import * as eventSchema from './schema/event';
const schema = {
  ...auth,
  ...transactionSchema,
  //...eventSchema
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
})();

export const db = drizzle(pool, { schema });
