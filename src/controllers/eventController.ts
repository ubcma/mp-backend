import { Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { event, eventTag, tag } from "../db/schema/event";
import { auth } from "../lib/auth";
import { userProfile, userRoleEnum } from "../db/schema/userProfile";
import { users } from "../db/schema/auth";

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
      .leftJoin(tag, eq(eventTag.tagId, tag.id));

    res.status(200).json(allEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

type CreateEventInput = {
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: number;
  location: string;
  startsAt: Date;
  endsAt: Date;
};

export const createEvent = async (req: Request, res: Response) => {
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

    const [result] = await db
      .select({
        userRole: userProfile.role,
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(eq(users.id, userId))
      .limit(1);

    const userRole = result?.userRole;

    if (userRole !== "Admin") {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }

    const data: CreateEventInput = req.body;

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    const response = await db
      .insert(event)
      .values({
        title: data.title,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price?.toString(),
        location: data.location,
        startsAt: startsAt,
        endsAt: endsAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.json({ message: "Successfully created event:", body: response });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
