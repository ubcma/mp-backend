
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema/auth';
import { userProfiles } from '../db/schema/userProfiles';
import { redis } from './auth';

export async function verifyAuthToken(sessionId: string) {
    try {
      const sessionDataRaw = await redis.get(sessionId);
  
      if (!sessionDataRaw) {
        console.error('No session found for token');
        return null;
      }
  
      const sessionData = JSON.parse(sessionDataRaw);
  
      return sessionData;
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return null;
    }
  }

export async function getUserFromSessionToken(token: string | undefined) {
  if (!token) return null;

  const data = await verifyAuthToken(token);

  if (!data.user) return null;

  const userId = data.user.id;

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      major: userProfiles.major,
      yearLevel: userProfiles.yearLevel,
      role: userProfiles.role,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!result.length) return null;

  const user = result[0];

  return {
    name: user.name,
    email: user.email,
    major: user.major,
    yearLevel: user.yearLevel,
    role: user.role,
  };
}
