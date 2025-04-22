import express from "express";
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import dotenv from "dotenv";
dotenv.config();
import { auth } from "./lib/auth";
import testRouter from "./routes/test";
import meRouter from "./routes/me";
const app = express();
const port = process.env.PORT || 8080;

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use("/api/test", testRouter);
app.use("/api/me", meRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});