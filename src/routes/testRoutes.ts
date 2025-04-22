import { Router } from "express";
import { getTest } from "../controllers/testController";

const testRouter = Router();

testRouter.get("/test", getTest);

export default testRouter;
