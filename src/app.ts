import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth, getAllowedOrigins } from "./lib/auth";
import dotenv from "dotenv";
dotenv.config({ path: ['.env.local', '.env', '.env.development.local'] });
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";
import stripeRouter from "./routes/stripeRoutes"
import { handleStripeWebhook } from "./controllers/stripeController";
import userRouter from "./routes/userRoutes";

const app = express();

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

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(cookieParser());

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());

app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);
app.use("/api/stripe", stripeRouter);
app.use("/api/users", userRouter);

export default app;
