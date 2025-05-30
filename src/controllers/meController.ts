import { Request, Response } from "express";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { eq } from "drizzle-orm";
import { users } from "../db/schema/auth";
import { auth } from "../lib/auth";
import { isValidField } from "../lib/utils";
import { UpdateUserProfileInput } from "../types/user";

export const getMe = async (req: Request, res: Response) => {
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

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileInput
) {
  try {
    const result = await db
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

    return result[0];
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

    const userId = session.user.id;

    const updatedUser = await updateUserProfile(userId, req.body);

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
