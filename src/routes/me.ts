import { Router } from "express";
import { getMe } from "../controllers/meController";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../lib/middleware/requireAuth";

const meRouter = Router();

meRouter.get("/", requireAuth, asyncHandler(getMe));

export default meRouter;
