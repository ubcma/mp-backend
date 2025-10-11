import { Request, Response } from "express";
import { db } from "../db";
import { userProfile } from "../db/schema/userProfile";
import { users } from "../db/schema/auth";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { auth } from "../lib/auth";
import { validateAdmin } from "../lib/validateSession";


export const exportUsers = async (req: Request, res: Response) => {
  const { Parser } = require('json2csv')
  const headers = new Headers();
  if (req.headers.cookie) headers.append("cookie", req.headers.cookie);

  try {
    const session = await auth.api.getSession({ headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const userId = session.user.id;
    validateAdmin(userId);

    const exportType = (req.query.exportType as string) || "all";
    const role = (req.query.role as string) || null;
    const search = (req.query.search as string)?.toLowerCase() || null;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
    const offset = (page - 1) * pageSize;

  
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

    // Query
    let userQuery = db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: userProfile.role,
        faculty: userProfile.faculty,
        major: userProfile.major,
        year: userProfile.year,
        linkedinUrl: userProfile.linkedinUrl,
        diet: userProfile.diet,
        interests: userProfile.interests,
        onboardingComplete: userProfile.onboardingComplete,
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId));

    if (whereCondition) userQuery.where(whereCondition);
    if (exportType === "page") userQuery.limit(pageSize).offset(offset);

    const userResults = await userQuery;

    // Format + CSV
    const fields = [
      "userId",
      "name",
      "email",
      "role",
      "faculty",
      "major",
      "year",
      "linkedinUrl",
      "diet",
      "interests",
      "onboardingComplete",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(
      userResults.map((u) => ({
        ...u,
        diet: Array.isArray(u.diet) ? u.diet.join(", ") : u.diet ?? "",
        interests: Array.isArray(u.interests)
          ? u.interests.join(", ")
          : u.interests ?? "",
        onboardingComplete: u.onboardingComplete ? "Yes" : "No",
      }))
    );

    res.header("Content-Type", "text/csv");
    res.attachment(
      `ubcma_users_export_${exportType === "page" ? `page_${page}` : "all"}_${search ? `search_${search}` : ""}_${role ? `role_${role}` : ""}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("Failed to export users:", error);
    res.status(500).json({ message: "Failed to export users" });
  }
};
