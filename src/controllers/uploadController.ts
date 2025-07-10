// src/controllers/uploadController.ts
import { Request, Response } from "express";
import { createUploadthing, type FileRouter } from "uploadthing/express";
import { auth } from "../lib/auth.js";
import { db } from "../db"; // Assuming you have a db instance
import { userProfile } from "../db/schema/userProfile"; // Adjust path as needed
import { eq } from "drizzle-orm";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  profilePicture: f({
    image: {
      maxFileSize: "1MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // Convert Express headers to Web Headers
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await auth.api.getSession({ headers });

      // If you throw, the user will not be able to upload
      if (!session?.user) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        // Update the user's profile with the new avatar URL
        await db
          .update(userProfile)
          .set({
            avatar: file.url,
            updatedAt: new Date(),
          })
          .where(eq(userProfile.userId, metadata.userId));

        console.log("Profile picture updated for user:", metadata.userId);
        // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
        return { success: true, url: file.url };
      } catch (error) {
        console.error("Failed to update profile picture:", error);
        throw error;
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;