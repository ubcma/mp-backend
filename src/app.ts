import express from "express";
import dotenv from "dotenv";
import { exampleRouter } from "./routes/example";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(express.json());
app.use("/api/example", exampleRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
