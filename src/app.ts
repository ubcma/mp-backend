import express from "express";
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import type { Request, Response, NextFunction } from 'express';
import dotenv from "dotenv";
dotenv.config();
import { auth } from "./lib/auth";
import testRouter from "./routes/testRoute";
import meRouter from "./routes/meRoute";
const app = express();
const port = process.env.PORT || 8080;

app.all('/api/auth/*splat', toNodeHandler(auth)); // ✅ Better Auth native routes
app.use(express.json());
app.use(cookieParser());
app.use("/api/test", testRouter);
app.use("/api/me", meRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error caught:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});