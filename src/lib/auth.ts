import { betterAuth } from "better-auth";
import { createAuthMiddleware, openAPI } from "better-auth/plugins";
import { Pool } from "pg";
import { Redis } from "ioredis";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { eq } from "drizzle-orm";

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

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
  },
  origin: [
    process.env.FRONTEND_URL!,
    "https://app.ubcma.ca",
    "https://api.ubcma.ca",
    "https://membership-portal-ubcmas-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:4000",
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [openAPI()],
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  trustedOrigins: [
    process.env.FRONTEND_URL!,
    "https://app.ubcma.ca",
    "https://api.ubcma.ca",
    "https://membership-portal-ubcmas-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:4000",
  ],
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
    cookiePrefix: "membership-portal",
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: ".ubcma.ca",
    },
    defaultCookieAttributes: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      partitioned: isProduction,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;

      if (newSession && newSession.user) {
        const user = newSession.user;

        try {
          const existingUser = await db
            .select()
            .from(userProfile)
            .where(eq(userProfile.userId, user.id))
            .limit(1);

          if (existingUser.length > 0) {
            return;
          }

          console.log(`Creating profile for new user id=${user.id}`);

          await db
            .insert(userProfile)
            .values({
              userId: user.id,
              name: user.name,
              email: user.email,
              avatar: user.image,
              onboardingComplete: false,
            })
            .onConflictDoNothing({
              target: userProfile.userId,
            });

          console.log(`✅ Success! Profile created for user ${user.name}`);
        } catch (error) {
          console.error("❌ Failed to create user profile:", error);
        }
      }
    }),
  },
});
