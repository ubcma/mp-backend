import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { getAllUsers, updateUserRole } from "../controllers/userController";

const userRouter = Router();

userRouter.get("/", asyncHandler(getAllUsers));
userRouter.put("/:userId/role", asyncHandler(updateUserRole));

export default userRouter;
