import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import {
    getAlumniByCompany,
    getAllAlumni,
    createAlumniProfile,
    updateAlumniProfile,
    deleteAlumniProfile,
} from "../controllers/alumniController";

const alumniRouter = Router();

alumniRouter.get("/", getAllAlumni);
// alumniRouter.get("/by-company", getAlumniByCompany);
alumniRouter.post("/create", asyncHandler(createAlumniProfile));
alumniRouter.put("/update", asyncHandler(updateAlumniProfile));
alumniRouter.delete("/delete", asyncHandler(deleteAlumniProfile));

export default alumniRouter;
