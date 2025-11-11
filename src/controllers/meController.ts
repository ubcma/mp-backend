import { Request, Response } from "express";
import { db } from "../db";
import { userProfile, user } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { isValidField } from "../lib/utils";
import { UpdateUserProfileInput } from "../types/user";
import { deleteOldFile } from "../lib/uploadthing";

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
        userId: user.id,
        name: user.name,
        email: user.email,
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
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .where(eq(user.id, userId))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const retrievedUser = result[0];
    return res.json({
      userId: String(retrievedUser.userId),
      name: retrievedUser.name,
      email: retrievedUser.email,
      role: retrievedUser.role,
      faculty: retrievedUser.faculty,
      major: retrievedUser.major,
      year: retrievedUser.year,
      avatar: retrievedUser.avatar,
      bio: retrievedUser.bio,
      linkedinUrl: retrievedUser.linkedinUrl,
      diet: retrievedUser.diet,
      interests: retrievedUser.interests,
      onboardingComplete: retrievedUser.onboardingComplete,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileInput
) {
  try {
    let oldAvatarUrl: string | null = null;

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
      deleteOldFile(oldAvatarUrl).catch((e) =>
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
