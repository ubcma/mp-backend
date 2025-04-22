import { Router } from "express";
import { getMe } from "../controllers/meController";
import { asyncHandler } from "../lib/asyncHandler";

const meRouter = Router();

meRouter.get("/", asyncHandler(getMe));

export default meRouter;
