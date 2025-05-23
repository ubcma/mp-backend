import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";

const app = express();

app.use(cors({
  origin: (origin, callback) => {
      if (origin && origin.includes('.vercel.app') || origin === process.env.FRONTEND_URL || origin === 'http://localhost:3000' || origin === 'http://localhost:4000') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  credentials: true,
}));

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);

export default app;
