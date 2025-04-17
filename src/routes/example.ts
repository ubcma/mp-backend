import { Router } from "express";
import { getExample } from "../controllers/exampleController"

export const exampleRouter = Router();

exampleRouter.get("/", getExample);