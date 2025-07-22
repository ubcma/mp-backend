import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import dotenv from "dotenv";
dotenv.config({ path: ['.env.local', '.env', '.env.development.local'] });
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";
import stripeRouter from "./routes/stripeRoutes"
import { handleStripeWebhook } from "./controllers/stripeController";
import { auth } from "./lib/auth"; 

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.FRONTEND_URL,
  credentials: true,
}));

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(cookieParser());

app.post(
  "/api/stripe/webhook", // eventual endpoint that will be used for webhook in development (currently testing with cli)
  express.raw({ type: "application/json" }),
  handleStripeWebhook // reference controller directly (bypass stripeRouter.ts), calls verifyStripeWebhook using stripe object to interact with sdk 
);

app.use(express.json());

app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);
app.use("/api/stripe", stripeRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});