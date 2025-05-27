import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://membership.ubcma.ca",
  "https://membership-portal-git-ethan-mp-17-admin-65a1ff-ubcmas-projects.vercel.app",
  "http://localhost:3000",
  "http://localhost:4000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);

export default app;
