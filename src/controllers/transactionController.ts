import { Request, Response } from "express";
import { db } from "../db";
import { transaction } from "../db/schema/transaction";
import { userProfile } from "../db/schema/userProfile";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const offset = (page - 1) * pageSize;

    const purchaseType = (req.query.purchaseType as string) || null;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : null;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : null;
    const order =
      (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

    const whereClauses: ReturnType<typeof sql>[] = [];

    if (purchaseType && purchaseType !== "all") {
      whereClauses.push(sql`${transaction.purchase_type} = ${purchaseType}`);
    }

    if (year && !Number.isNaN(year)) {
      whereClauses.push(
        sql`EXTRACT(YEAR FROM ${transaction.paid_at}) = ${year}`
      );
    }

    if (month && !Number.isNaN(month) && month >= 1 && month <= 12) {
      whereClauses.push(
        sql`EXTRACT(MONTH FROM ${transaction.paid_at}) = ${month}`
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
      .from(transaction);

    if (whereCondition) totalCountQuery.where(whereCondition);

    const [{ count: totalCount = 0 } = {}] = await totalCountQuery;

    const yearExpr = sql<number>`EXTRACT(YEAR FROM ${transaction.paid_at})::int`;

    const availableYearsResult = await db
      .select({ year: yearExpr })
      .from(transaction)
      .groupBy(yearExpr)
      .orderBy(sql`${yearExpr} DESC`);

    const availableYears = availableYearsResult
      .map((row) => Number(row.year))
      .filter((y) => !Number.isNaN(y));

    const paidAtOrder =
      order === "asc" ? asc(transaction.paid_at) : desc(transaction.paid_at);

    const txQuery = db
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
      .$dynamic();

    if (whereCondition) txQuery.where(whereCondition);

    const tx = await txQuery
      .orderBy(paidAtOrder)
      .limit(pageSize)
      .offset(offset);

    res.status(200).json({
      data: tx,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        availableYears,
        filters: {
          purchaseType,
          year,
          month,
          order,
        },
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
