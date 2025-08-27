import { betterAuth, User } from "better-auth";
import { createAuthMiddleware, openAPI } from "better-auth/plugins";
import { Pool } from "pg";
import { Redis } from "ioredis";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { eq } from "drizzle-orm";
import { sendEmail } from "./emailService";
import { Request } from "express";

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
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const isDevelopment = process.env.NODE_ENV === "development";
const isSecureContext = isProduction || isVercelPreview;

export const getAllowedOrigins = () => {
  const origins = [
    process.env.FRONTEND_URL!,
    "https://app.ubcma.ca",
    "https://preview.ubcma.ca",
    "http://localhost:3000",
  ];

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.VERCEL_BRANCH_URL) {
    origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  return origins.filter(Boolean);
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
    // ENABLE CODE BELOW ONCE EMAIL IS CONFIGURED
    // requireEmailVerification: true,
    // sendResetPassword: async ({ user, url }, request) => {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Reset your password",
    //     htmlBody: `<h2>Click the link to reset your password: <a href=${url}>${url}</a><h2>`,
    //   });
    // },
  },
  origin: getAllowedOrigins(),
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
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
  },
  plugins: [openAPI()],
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  trustedOrigins: getAllowedOrigins(),
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
      domain: isProduction ? ".ubcma.ca" : undefined,
    },
    defaultCookieAttributes: {
      secure: isSecureContext,
      httpOnly: true,
      sameSite: isDevelopment ? "lax" : "none",
      partitioned: isProduction,
    },
  },
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 60,
    max: 100,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
        await sendEmail({
            to: user.email,
            subject: 'Verify your email address',
            htmlBody: `Click the link to verify your email: ${url}`
        })
    },
    sendOnSignUp: true, 
    autoSignInAfterVerification: true,
    async afterEmailVerification({user, request}: {user: User, request: Request}) {
      console.log(`${user.email} has been successfully verified!`);
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
