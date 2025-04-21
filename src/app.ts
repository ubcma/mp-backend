import express from "express";
import dotenv from "dotenv";
dotenv.config();
import { userRouter } from "./routes/users";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use("/api/users", userRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
