import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth, getAllowedOrigins } from "./lib/auth";
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env", ".env.development.local"] });
import transactionRouter from "./routes/transactionRoutes";
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";
import stripeRouter from "./routes/stripeRoutes";
import { handleStripeWebhook } from "./controllers/stripeController";
import userRouter from "./routes/userRoutes";
import exportRouter from "./routes/exportRoutes";
import validateEmailRouter from "./routes/validateEmailRoutes";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import emailRouter from "./routes/emailRoutes";
import morgan from 'morgan';
import jobRouter from "./routes/jobRoutes";
import qrRouter from "./routes/qrRoutes";
import ticketRouter from "./routes/ticketRoutes";

const app = express();

if (process.env.NODE_ENV !== "development") {
  app.set("trust proxy", 1); // trust first proxy for rate limiting

  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-8',
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown-ip"),
    statusCode: 429,
    message: "Too many requests, please try again later",
  });

  app.use(limiter);
}

app.use(morgan('dev'));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || getAllowedOrigins().includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(cookieParser());

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook // reference controller directly (bypass stripeRouter.ts), calls verifyStripeWebhook using stripe object to interact with sdk
);

app.use(express.json());

app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);
app.use("/api/stripe", stripeRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/users", userRouter);
app.use("/api/validate-email", validateEmailRouter);
app.use("/api/email", emailRouter);
app.use("/api/export", exportRouter);
app.use("/api/qr", qrRouter);
app.use("/api/ticket", ticketRouter);

export default app;


