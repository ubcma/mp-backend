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
import validateEmailRouter from "./routes/validateEmailRoutes";
import rateLimit from "express-rate-limit";

const app = express();

const limiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 100,
  limit: 100,
  handler: (req, res) => {
    res.status(429).send({ error: 'Too many requests, please try again later' });
  }
})

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

app.use(limiter);

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
app.use("/api/users", userRouter);
app.use("/api/validate-email", validateEmailRouter);

export default app;


