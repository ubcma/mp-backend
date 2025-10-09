// src/routes/stripe.routes.ts
import { Router } from "express";
import { getAllTransactions, getTotalRevenue } from "../controllers/transactionController";
import { asyncHandler } from "../lib/asyncHandler";

// call the library function to create a payment intent via the controller
// create a webhook (webhook should live in here) (/webhook) (from the stripe sdk)

const transactionRouter = Router();

transactionRouter.get("/", asyncHandler(getAllTransactions));
transactionRouter.get("/revenue", asyncHandler(getTotalRevenue));

export default transactionRouter;
