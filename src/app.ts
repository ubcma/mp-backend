import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth, getAllowedOrigins } from "./lib/auth";
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";
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
app.use(express.json());
app.use(cookieParser());
app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);
app.use("/api/users", userRouter);

export default app;
