import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { createJob, getAllJobs } from "../controllers/jobController";

const jobRouter = Router();

jobRouter.get("/", getAllJobs);
jobRouter.post("/create", asyncHandler(createJob));
// jobRouter.get("/:id");
// jobRouter.put('/update')
// jobRouter.delete('/delete')

export default jobRouter;
