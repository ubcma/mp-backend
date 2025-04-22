import { Request, Response } from "express";
import { getUserFromSessionToken } from "../lib/getUserFromSessionToken";

export const getMe = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getUserFromSessionToken(token);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
