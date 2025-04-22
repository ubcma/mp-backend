import express from "express";
import { toNodeHandler } from "better-auth/node";
import dotenv from "dotenv";
dotenv.config();
import { auth } from "./lib/auth";
import testRouter from "./routes/testRoutes";
const app = express();
const port = process.env.PORT || 8080;

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use("/api", testRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});