import { Request, Response } from "express";
import { db } from "../db";
import { accounts, users } from "../db/schema/auth";
import { eq } from "drizzle-orm";

type validateEmailResponse = {
  hasAccount: boolean;
  email?: string;
  provider?: "google" | "credential";
};

export const validateEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userWithAccounts = await db
      .select({
        userId: users.id,
        email: users.email,
        provider: accounts.providerId,
      })
      .from(users)
      .leftJoin(accounts, eq(users.id, accounts.userId))
      .where(eq(users.email, email));

    if (userWithAccounts.length === 0) {
      return res.status(200).json({
        hasAccount: false,
      });
    }

    const provider = userWithAccounts[0].provider;

    return res.status(200).json({
      hasAccount: true,
      provider: provider,
      userId: userWithAccounts[0].userId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to validate email" });
  }
};
