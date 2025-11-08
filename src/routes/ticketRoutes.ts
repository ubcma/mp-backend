import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ticketScanHandler } from "../controllers/ticketController";

const ticketRouter = Router();

ticketRouter.get("/scan/:ticketCode", asyncHandler(ticketScanHandler));


export default ticketRouter;
