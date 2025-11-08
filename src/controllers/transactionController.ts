import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema/auth";
import { transaction } from "../db/schema/transaction";
import { userProfile } from "../db/schema/userProfile";
import { count, eq, sql } from "drizzle-orm";
import { auth } from "../lib/auth";
import { validateAdmin } from "../lib/validateSession";

export const getAllTransactions = async (req: Request, res: Response) => {
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

    await validateAdmin(userId);

    // Extract page and pageSize from query params, with defaults
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Fetch paginated transactions
    const tx = await db
      .select({
        id: transaction.transaction_id,
        userName: userProfile.name,
        email: userProfile.email,
        userId: transaction.userId,
        purchaseType: transaction.purchase_type,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.payment_method_type,
        paymentIntentId: transaction.stripe_payment_intent_id,
        eventId: transaction.event_id,
        paidAt: transaction.paid_at,
        status: transaction.status,
      })
      .from(transaction)
      .leftJoin(userProfile, eq(transaction.userId, userProfile.userId))
      .limit(pageSize)
      .offset(offset);

    const totalCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transaction);

    const totalCount = totalCountResult[0]?.count || 0;

    res.status(200).json({
      data: tx,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

export const getTotalRevenue = async (req: Request, res: Response) => {
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

    await validateAdmin(userId);

    const result = await db
      .select({
        totalRevenue: sql<number>`SUM(CAST(${transaction.amount} AS numeric))`,
      })
      .from(transaction)
      .where(sql`${transaction.status} = 'succeeded'`);

    const totalRevenue = result[0]?.totalRevenue || 0;

    res.status(200).json({ totalRevenue });
  } catch (error) {
    if (error instanceof Error && error.message?.includes("Forbidden")) {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }
    console.error("Failed to fetch total revenue:", error);
    res.status(500).json({ error: "Failed to fetch total revenue" });
  }
};
