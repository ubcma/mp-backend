import { betterAuth } from "better-auth";
import { createAuthMiddleware, openAPI } from "better-auth/plugins";
import { Pool } from "pg";
import { Redis } from "ioredis";
import { db } from "../db";
import { userProfiles } from "../db/schema/userProfiles";

export const redis = new Redis(`${process.env.REDIS_URL}?family=0`)
  .on("error", (err) => {
    console.error("Redis connection error:", err);
  })
  .on("connect", () => {
    console.log("Redis connected");
  })
  .on("ready", () => {
    console.log("Redis ready");
  });

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [openAPI()],
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    log: console.log,
  }),
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, value, "EX", ttl);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  advanced: {
    cookiePrefix: "membership-portal"
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          console.log(`Creating profile for user id=${newSession.user.id}`);

          await db.insert(userProfiles).values({
            userId: newSession.user.id,
            name: newSession.user.name,
            email: newSession.user.email,
            role: "Member",
            avatarUrl: "",
            bio: "",
            linkedinUrl: "",
            yearLevel: "",
            major: "",
            specialization: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log(`✅ Profile created for user id=${newSession.user.id}`);
        }
      }
    }),
  },
});
