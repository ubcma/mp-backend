import { Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { event, eventTag, tag } from "../db/schema/event";

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const allEvents = await db
      .select({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        price: event.price,
        tags: tag.name,
        description: event.description,
        imageUrl: event.imageUrl,
      })
      .from(event)
      .leftJoin(eventTag, eq(eventTag.eventId, event.id))
      .leftJoin(tag, eq(eventTag.tagId, tag.id))

    res.status(200).json(allEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};