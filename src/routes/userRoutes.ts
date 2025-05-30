import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { getAllUsers } from "../controllers/userController";

const userRouter = Router();

userRouter.get("/", asyncHandler(getAllUsers));

export default userRouter;
