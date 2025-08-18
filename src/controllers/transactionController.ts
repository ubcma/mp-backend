import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema/auth";
import { transaction } from "../db/schema/transaction";
import { userProfile } from "../db/schema/userProfile";
import { count, eq, sql } from "drizzle-orm";
import { auth } from "../lib/auth";

export const getAllTransactions = async (req: Request, res: Response) => {
  const headers = new Headers();

  if (req.headers.cookie) {
    headers.append("cookie", req.headers.cookie);
  }

  try {
    const session = await auth.api.getSession({ headers });

    // Uncomment to restrict to Admin users only
    /*
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    */

    // Extract page and pageSize from query params, with defaults
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    console.log(page + " " + pageSize)

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
