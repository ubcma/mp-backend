import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { getAllUsers } from "../controllers/userController";
import { validateEmail } from "../controllers/validateEmailController";

const validateEmailRouter = Router();

validateEmailRouter.post("/", asyncHandler(validateEmail));

export default validateEmailRouter;
