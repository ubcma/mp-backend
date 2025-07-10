// src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

import { auth } from "./lib/auth.js";
import meRouter from "./routes/meRoute.js";
import eventRouter from "./routes/eventRoutes.js";
import uploadthingRoutes from "./routes/uploadthing.js";

// Type assertion to help TypeScript understand the router type
type UploadThingRouter = express.Router;
const uploadthingRoutesTyped = uploadthingRoutes as UploadThingRouter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());

app.use("/api/me", meRouter);
app.use("/api/events", eventRouter);
app.use("/api/uploadthing", uploadthingRoutesTyped);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
