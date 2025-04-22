// lib/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../getUserFromSessionToken";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies.token;

    if (!token) {
      const error = new Error("Unauthorized - No token");
      // @ts-ignore
      error.status = 401;
      return next(error);
    }

    const sessionData = await verifyAuthToken(token);

    if (!sessionData) {
        const error = new Error('Unauthorized - Invalid session');
        // @ts-ignore
        error.status = 401;
        return next(error);
      }

    req.user = sessionData.user;

    next();
  } catch (error) {
    console.error("Error in requireAuth:", error);
    return next(error);
  }
}
