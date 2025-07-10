// src/routes/uploadthing.ts
import { Router } from "express";
import { createRouteHandler } from "uploadthing/express";
import { ourFileRouter } from "../lib/uploadthing.js"; // or .ts if you’ve converted that too

const router = Router();
router.use(createRouteHandler({ router: ourFileRouter }));
export default router;
