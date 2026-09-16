import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { createJob, getAllJobs, updateJob, deleteJob } from "../controllers/jobController";

const jobRouter = Router();

jobRouter.get("/", getAllJobs);
jobRouter.post("/create", asyncHandler(createJob));
jobRouter.put("/update", asyncHandler(updateJob));
jobRouter.delete("/delete", asyncHandler(deleteJob));

export default jobRouter;