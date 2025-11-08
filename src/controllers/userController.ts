import { Request, Response } from "express";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { users } from "../db/schema/auth";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { auth } from "../lib/auth";
import { validateAdmin } from "../lib/validateSession";

export const getAllUsers = async (req: Request, res: Response) => {
  const headers = new Headers();
  if (req.headers.cookie) headers.append("cookie", req.headers.cookie);

  try {
    const session = await auth.api.getSession({ headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const userId = session.user.id;
    await validateAdmin(userId);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const offset = (page - 1) * pageSize;
    const role = (req.query.role as string) || null;
    const search = (req.query.search as string)?.toLowerCase() || null;


    const whereClauses: any[] = [];
    if (role && role !== "All Roles") {
      whereClauses.push(sql`${userProfile.role} = ${role}`);
    }

    if (search) {
      whereClauses.push(
        sql`(LOWER(${users.name}) LIKE ${"%" + search + "%"} 
          OR LOWER(${users.email}) LIKE ${"%" + search + "%"})`
      );
    }

    const whereCondition =
      whereClauses.length > 1
        ? and(...whereClauses)
        : whereClauses.length === 1
        ? whereClauses[0]
        : undefined;


    const totalCountQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId));

    if (whereCondition) totalCountQuery.where(whereCondition);

    const [{ count: totalCount = 0 } = {}] = await totalCountQuery;


    let userQuery = db
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
      .limit(pageSize)
      .offset(offset);

    if (whereCondition) userQuery.where(whereCondition);

    const userResults = await userQuery;

    res.status(200).json({
      data: userResults,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        filters: { role, search },
      },
    });
  } catch (error) {
    if ((error instanceof Error) && error.message?.includes("Forbidden")) {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }
    console.error("Failed to fetch users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const headers = new Headers();
  if (req.headers.cookie) headers.append("cookie", req.headers.cookie);

  try {
    // admin authorization for current user 
    const session = await auth.api.getSession({ headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const adminId = session.user.id;
    await validateAdmin(adminId);

    // requested user, requested role change 
    const { userId } = req.params; 
    const { newRole } = req.body; 

    if (!newRole) {
      return res.status(400).json({ error: "Missing newRole in request body" });
    }


    const [updatedUser] = await db
      .update(userProfile)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, userId))
      .returning({
        userId: userProfile.userId,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
        updatedAt: userProfile.updatedAt,
      });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`Updated role for user ${userId} to ${newRole}`);

    return res.status(200).json({
      message: "Successfully updated user role",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};