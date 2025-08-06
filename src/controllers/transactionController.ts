import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema/auth";
import { transaction } from "../db/schema/transaction";
import { userProfile } from "../db/schema/userProfile";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";

export const getAllTransactions = async (req: Request, res: Response) => {
  const headers = new Headers();

  if (req.headers.cookie) {
    headers.append('cookie', req.headers.cookie);
  }

  try {
    const session = await auth.api.getSession({ headers });

    // Uncomment to restrict to Admin users only
    /*
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ error: "Forbidden: Admins only" });
      return;
    }
    */

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
        paymentIntentId: transaction.stripe_payment_intent_Id,
        eventId: transaction.event_id,
        
        paidAt: transaction.paid_at,
      })
      .from(transaction)
      .leftJoin(userProfile, eq(transaction.userId, userProfile.userId));

    res.status(200).json(tx); 
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" }); // ✅ same here
  }
};
