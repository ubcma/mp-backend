import { betterAuth } from "better-auth";
import { createAuthMiddleware, openAPI } from "better-auth/plugins";
import { Pool } from "pg";
import { Redis } from "ioredis";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";

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
  origin:
    process.env.NODE_ENV === "development"
      ? ["http://localhost:3000"]
      : [process.env.FRONTEND_URL!],
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
    log: console.log,
  }),
  trustedOrigins: ["http://localhost:3000"],
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
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;

      if (newSession && newSession.user) {
        const user = newSession.user;

        try {
          console.log(`Creating profile for new user id=${user.id}`);

          await db
            .insert(userProfile)
            .values({
              userId: user.id,
              name: user.name ?? "",
              email: user.email,
              avatar: "",
              bio: "",
              linkedinUrl: "",
              year: "",
              faculty: "",
              major: "",
              diet: [],
              interests: [],
              onboardingComplete: false,
            })
            .onConflictDoNothing({
              target: userProfile.userId,
            });

          console.log(`✅ Success! Profile created for user ${user.name}`);
        } catch (error) {
          console.error("Failed to create user profile:", error);
        }
      }
    }),
  },
});
