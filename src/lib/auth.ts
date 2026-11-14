import { betterAuth, User } from "better-auth";
import { createEmailVerificationToken } from "better-auth/api";
import { createAuthMiddleware, openAPI } from "better-auth/plugins";
import { Pool } from "pg";
import { Redis } from "ioredis";
import { db } from "../db";
import { users } from "../db/schema/auth";
import { userProfile } from "../db/schema/userProfile";
import { eq, sql } from "drizzle-orm";
import { sendEmail } from "./emailService";
import { Request } from "express";
import {
  emailVerificationTemplate,
  forgotPasswordTemplate,
} from "../aws/emailTemplates";

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
const isDevelopment = process.env.NODE_ENV === "development";
const cookieSameSite = (process.env.COOKIE_SAME_SITE as "lax" | "none") || "lax";
const isSecureContext = isProduction || cookieSameSite === "none";

export const getAllowedOrigins = () => {
  const origins = [
    process.env.FRONTEND_URL!,
    process.env.NETWORK_URL!,
    "https://app.ubcma.ca",
    "https://preview.ubcma.ca",
    "https://network.ubcma.ca",
    "https://gateways.ubcma.ca",
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  if (process.env.ADDITIONAL_ORIGINS) {
    origins.push(
      ...process.env.ADDITIONAL_ORIGINS.split(",").map((o) => o.trim())
    );
  }

  return origins.filter(Boolean);
};

/** Matches better-auth getBaseURL(BETTER_AUTH_URL, basePath) for link building in hooks. */
export function getAuthServiceBaseURL(): string {
  const raw = process.env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "";
  const basePath = "/api/auth";
  try {
    const pathname = new URL(raw).pathname.replace(/\/+$/, "") || "";
    if (pathname && pathname !== "/") {
      return raw;
    }
  } catch {
    return `${raw}${basePath}`;
  }
  return `${raw}${basePath}`;
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === "production",
    sendResetPassword: async ({ user, url }) => {
      try {
        const { subject, htmlBody } = forgotPasswordTemplate(url);
        await sendEmail({ to: user.email, subject, htmlBody });
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error("Error sending password reset email:", error);
        throw error;
      }
    },
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
      sameSite: cookieSameSite,
    },
  },
  // Per-IP (Redis). Sized for Gateways morning sign-in on shared venue WiFi;
  // override with AUTH_RATE_LIMIT_WINDOW / AUTH_RATE_LIMIT_MAX.
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: Number(process.env.AUTH_RATE_LIMIT_WINDOW) || 60,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 1_000,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      try {
        const { subject, htmlBody } = emailVerificationTemplate(url);
        await sendEmail({ to: user.email, subject, htmlBody });
        console.log(`✅ Verification email sent to ${user.email}`);
      } catch (error) {
        console.error("Error sending verification email:", error);
        throw error;
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;

      const rawEmail = ctx.body?.email;
      if (typeof rawEmail !== "string") return;
      const email = rawEmail.toLowerCase();

      const [existing] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);

      // A verified account still takes the normal "already exists" path.
      if (!existing || existing.emailVerified) return;

      const callbackURL =
        typeof ctx.body?.callbackURL === "string" ? ctx.body.callbackURL : "/";
      const token = await createEmailVerificationToken(
        process.env.BETTER_AUTH_SECRET!,
        existing.email
      );
      const url = `${getAuthServiceBaseURL()}/verify-email?token=${token}&callbackURL=${encodeURIComponent(callbackURL)}`;
      const { subject, htmlBody } = emailVerificationTemplate(url);
      await sendEmail({ to: existing.email, subject, htmlBody });
      console.log(`✅ Verification email resent to ${existing.email}`);

      // Same shape as a first sign-up when verification is required, so the
      // form shows "check your email" instead of "user already exists".
      return Response.json({
        token: null,
        user: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          emailVerified: false,
          image: existing.image,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      });
    }),
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
