import { Request, Response } from "express";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { eq } from "drizzle-orm";
import { users } from "../db/schema/auth";
import { auth } from "../lib/auth";
import { isValidField } from "../lib/utils";
import { UpdateUserProfileInput } from "../types/user";

// Utility to check for non-empty fields
function isValidField(value: any): boolean {
  return value !== undefined && value !== null && value !== "";
}

// Extract the UploadThing file key from its URL
function getFileKeyFromUrl(url: string): string | null {
  try {
    const parts = url.split("/");
    return parts[parts.length - 1];
  } catch {
    return null;
  }
}

// Dynamically import UTApi and delete the old avatar
async function deleteOldAvatar(oldAvatarUrl: string) {
  if (!oldAvatarUrl?.includes("uploadthing")) return;
  
  const fileKey = getFileKeyFromUrl(oldAvatarUrl);
  if (!fileKey) return;

  try {
    const { UTApi } = await import("uploadthing/server");
    // Pass your token from env
    const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN! });
    await utapi.deleteFiles([fileKey]);
    console.log("Successfully deleted old avatar:", fileKey);
  } catch (err) {
    console.error("Error deleting old avatar:", err);
    // We swallow errors so user update still succeeds
  }
}

export const getMe = async (req: Request, res: Response) => {
  const headers = new Headers();
  if (req.headers.cookie) {
    headers.append("cookie", req.headers.cookie);
  }

  try {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = session.user.id;
    const result = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: userProfile.role,
        faculty: userProfile.faculty,
        major: userProfile.major,
        year: userProfile.year,
        avatar: userProfile.avatar,
        bio: userProfile.bio,
        linkedinUrl: userProfile.linkedinUrl,
        diet: userProfile.diet,
        interests: userProfile.interests,
        onboardingComplete: userProfile.onboardingComplete,
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result[0];
    return res.json({
      userId: String(user.userId),
      name: user.name,
      email: user.email,
      role: user.role,
      faculty: user.faculty,
      major: user.major,
      year: user.year,
      avatar: user.avatar,
      bio: user.bio,
      linkedinUrl: user.linkedinUrl,
      diet: user.diet,
      interests: user.interests,
      onboardingComplete: user.onboardingComplete,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


type UpdateUserProfileInput = {
  name?: string;
  avatar?: string;
  year?: string;
  bio?: string;
  faculty?: string;
  major?: string;
  linkedinUrl?: string;
  interests?: string[];
  diet?: string[];
};
  
export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileInput
) {
  try {
    let oldAvatarUrl: string | null = null;

    // If they're changing their avatar, fetch the old one first
    if (data.avatar) {
      const current = await db
        .select({ avatar: userProfile.avatar })
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1);

      if (current.length && current[0].avatar) {
        oldAvatarUrl = current[0].avatar;
      }
    }

    const [updated] = await db
      .update(userProfile)
      .set({
        ...(isValidField(data.bio) && { bio: data.bio }),
        ...(isValidField(data.avatar) && { avatar: data.avatar }),
        ...(isValidField(data.year) && { year: data.year }),
        ...(isValidField(data.faculty) && { faculty: data.faculty }),
        ...(isValidField(data.major) && { major: data.major }),
        ...(isValidField(data.linkedinUrl) && {
          linkedinUrl: data.linkedinUrl,
        }),
        ...(isValidField(data.interests) && { interests: data.interests }),
        ...(isValidField(data.diet) && { diet: data.diet }),
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, userId))
      .returning();

    // Delete the old avatar in the background
    if (oldAvatarUrl && data.avatar && oldAvatarUrl !== data.avatar) {
      deleteOldAvatar(oldAvatarUrl).catch((e) =>
        console.error("Background deletion failed:", e)
      );
    }

    return updated;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
}

export const updateMe = async (req: Request, res: Response) => {
  const headers = new Headers();
  if (req.headers.cookie) {
    headers.append("cookie", req.headers.cookie);
  }

  try {
    const session = await auth.api.getSession({
      headers: headers,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updatedUser = await updateUserProfile(session.user.id, req.body);
    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
