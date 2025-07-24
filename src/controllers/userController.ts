import { Request, Response } from "express";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { users } from "../db/schema/auth";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";

export const getAllUsers = async (req: Request, res: Response) => {
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
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result[0];

    if (!user.role || user.role !== "Admin") {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const allUsers = await db
      .select({
        name: userProfile.name,
        email: userProfile.email,
        userId: userProfile.userId,
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
      .from(userProfile)
      .limit(50);

    res.status(200).json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};
