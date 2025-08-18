import { Router } from "express";
import { getMe, updateMe } from "../controllers/meController";
import { asyncHandler } from "../lib/asyncHandler";
import { getUserRegistrations } from "../controllers/registrationController";

const meRouter = Router();

meRouter.get("/", asyncHandler(getMe));
meRouter.post("/", asyncHandler(updateMe));
meRouter.put("/", asyncHandler(updateMe));
meRouter.get("/registrations", asyncHandler(getUserRegistrations));

export default meRouter;
