import { Request, Response } from "express";

export const getExample = async (req: Request, res: Response) => {
  res.json({ message: "Hello World!" });
};
