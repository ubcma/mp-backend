import { auth } from "./auth"; // Adjust the import path
import { db } from "../db";
import { users } from "../db/schema/auth";
import { eq } from "drizzle-orm";
import { userProfile } from "../db/schema/userProfile";

export async function validateSession(req: Request) {
  const cookieHeader = req.headers.get("cookie");

  const headers = new Headers();
  if (cookieHeader) {
    headers.append("cookie", cookieHeader);
  }

  try {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new Error("Unauthorized");
    }
    return session.user.id;
  } catch (error) {
    throw new Error("Unauthorized");
  }
}

export async function validateAdmin(userId: string) {
  const [user] = await db
    .select({
      userRole: userProfile.role,
    })
    .from(users)
    .leftJoin(userProfile, eq(users.id, userProfile.userId))
    .where(eq(users.id, userId))
    .limit(1);

  const userRole = user?.userRole;

  if (userRole !== "Admin") {
    console.log();
    throw new Error("Forbidden: Admins only");
  }
}
