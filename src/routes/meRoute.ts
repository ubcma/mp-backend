import { Router } from "express";
import { getMe, updateMe } from "../controllers/meController";
import { asyncHandler } from "../lib/asyncHandler";

const meRouter = Router();

meRouter.get("/", asyncHandler(getMe));
meRouter.post("/", asyncHandler(updateMe));

export default meRouter;
