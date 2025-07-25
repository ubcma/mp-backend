import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";
import userRouter from "./routes/userRoutes";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://app.ubcma.ca",
  "https://preview.ubcma.ca",
  "http://localhost:3000",          
  /\.preview\.ubcma\.ca$/,              
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.some(pattern =>
          pattern instanceof RegExp ? pattern.test(origin) : false
        );

      cb(null, isAllowed);
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
