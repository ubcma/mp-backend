
import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema/users";

export const getUsers = async (req: Request, res: Response) => {
  console.log("Here!")
    try {
      const taskResponse = await db.select().from(users);
      res.json(taskResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };