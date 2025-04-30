import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import dotenv from "dotenv";
dotenv.config();
import { auth } from "./lib/auth";
import meRouter from "./routes/meRoute";
import eventRouter from "./routes/eventRoutes";

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.FRONTEND_URL,
  credentials: true,
}));

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});