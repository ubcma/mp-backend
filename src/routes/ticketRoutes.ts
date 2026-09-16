import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ticketScanHandler } from "../controllers/ticketController";

const ticketRouter = Router();



ticketRouter.get("/test", (req, res) => {
  console.log("/api/ticket/test route hit");
  res.send("Ticket router active and working");
});


ticketRouter.get("/scan-debug/:ticketCode", (req, res) => {
  console.log(`Debug scan hit for code: ${req.params.ticketCode}`);
  res.send(`Scan route reached! Ticket code: ${req.params.ticketCode}`);
});


ticketRouter.get("/scan/:ticketCode", asyncHandler(ticketScanHandler));

export default ticketRouter;
