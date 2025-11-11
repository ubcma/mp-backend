import { Request, Response } from "express";
import { db } from "../db";
import { account, user} from "../db/schema";
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
        userId: user.id,
        email: user.email,
        provider: account.providerId,
      })
      .from(user)
      .leftJoin(account, eq(user.id, account.userId))
      .where(eq(user.email, email));

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
