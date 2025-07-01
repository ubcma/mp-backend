// mp-backend/src/controllers/uploadController.ts
import { Request, Response } from "express";
import { createUploadthing } from "uploadthing/server";
import { auth } from "../lib/auth";

// Simple endpoint to generate upload URL (alternative approach)
export const generateUploadUrl = async (req: Request, res: Response) => {
  try {
    const headers = new Headers();
    if (req.headers.cookie) {
      headers.append('cookie', req.headers.cookie);
    }

    const session = await auth.api.getSession({ headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Return success - let frontend handle UploadThing directly
    return res.json({ 
      success: true, 
      userId: session.user.id 
    });
  } catch (error) {
    console.error("Error in upload auth:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};