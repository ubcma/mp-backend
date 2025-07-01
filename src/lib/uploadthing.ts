
// mp-backend/src/lib/uploadthing.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "./auth";

const f = createUploadthing();

export const ourFileRouter = {
  profilePicture: f({ 
    image: { 
      maxFileSize: "1MB", 
      maxFileCount: 1,
    } 
  })
    .middleware(async ({ req }) => {
      // Get session from your existing auth
      const headers = new Headers();
      if (req.headers.get('cookie')) {
        headers.append('cookie', req.headers.get('cookie')!);
      }

      const session = await auth.api.getSession({ headers });
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Profile picture uploaded:", file.url, "for user:", metadata.userId);
      return { url: file.url, userId: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;