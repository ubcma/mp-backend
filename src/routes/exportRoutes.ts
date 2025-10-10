
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { exportUsers } from "../controllers/exportController";

const exportRouter = Router();


exportRouter.get("/", asyncHandler(exportUsers));

export default exportRouter;
