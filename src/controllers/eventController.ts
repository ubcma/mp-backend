import { Request, Response } from "express";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { event, eventTag, question, tag } from "../db/schema";
import { auth } from "../lib/auth";
import {
  CreateEventInput,
  DeleteEventInput,
  QuestionInput,
  UpdateEventInput,
} from "../types/event";
import { deleteOldFile } from "../lib/uploadthing";
import { validateAdmin } from "../lib/validateSession";

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const allEvents = await db
      .select({
        id: event.id,
        title: event.title,
        slug: event.slug,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        price: event.price,
        tags: tag.name,
        description: event.description,
        imageUrl: event.imageUrl,
        isVisible: event.isVisible,
        attendeeCap: event.attendeeCap,
        pricingTier: event.pricingTier,
        currentAttendeeCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM event_registration
          WHERE event_registration.event_id = ${event.id}
        )`,
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

export const getEventBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

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

    const [fetchedEvent] = await db
      .select({
        id: event.id,
        title: event.title,
        slug: event.slug,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        price: event.price,
        description: event.description,
        imageUrl: event.imageUrl,
        isVisible: event.isVisible,
        attendeeCap: event.attendeeCap,
        membersOnly: event.membersOnly,
        pricingTier: event.pricingTier,
        currentAttendeeCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM event_registration
          WHERE event_registration.event_id = ${event.id}
        )`,
      })
      .from(event)
      .where(eq(event.slug, slug))
      .limit(1);

    if (!fetchedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventQuestions = await db
      .select()
      .from(question)
      .where(eq(question.eventId, fetchedEvent.id));

    const tagRows = await db
      .select({
        id: tag.id,
        name: tag.name,
      })
      .from(eventTag)
      .leftJoin(tag, eq(eventTag.tagId, tag.id))
      .where(eq(eventTag.eventId, fetchedEvent.id));

    return res.json({
      event: fetchedEvent,
      questions: eventQuestions,
      tags: tagRows.map((t) => t.name).filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
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

    await validateAdmin(userId);

    const data: CreateEventInput = req.body;
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    const [eventRecord] = await db
      .insert(event)
      .values({
        title: data.title,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        location: data.location,
        isVisible: data.isVisible,
        membersOnly: data.membersOnly,
        attendeeCap: data.attendeeCap || null,
        pricingTier: data.pricingTier || null,
        startsAt: startsAt,
        endsAt: endsAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const eventId = eventRecord.id;

    if (Array.isArray(data.questions) && data.questions.length > 0) {
      await db.insert(question).values(
        data.questions.map((q: QuestionInput) => ({
          eventId,
          label: q.label,
          placeholder: q.placeholder,
          type: q.type,
          isRequired: q.isRequired,
          options: q.options ?? null,
          validation: q.validation ?? {},
          sortOrder: q.sortOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    console.log("Questions created successfully");

    return res.json({
      message: "Successfully created event",
      body: eventRecord,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateEventById = async (req: Request, res: Response) => {
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

    const data: UpdateEventInput = req.body;

    const eventToUpdate = await db
      .select({ imageUrl: event.imageUrl })
      .from(event)
      .where(eq(event.id, data.id))
      .limit(1);

    if (eventToUpdate.length > 0 && eventToUpdate[0].imageUrl) {
      deleteOldFile(eventToUpdate[0].imageUrl).catch((e) =>
        console.error("Background deletion failed:", e)
      );
    }

    const [updatedEvent] = await db
      .update(event)
      .set({
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        location: data.location,
        isVisible: data.isVisible,
        membersOnly: data.membersOnly,
        attendeeCap: data.attendeeCap || null,
        pricingTier: data.pricingTier || null,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        updatedAt: new Date(),
      })
      .where(eq(event.id, data.id))
      .returning();

    return res.json({
      message: "Successfully updated event",
      body: updatedEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteEventById = async (req: Request, res: Response) => {
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

    const data: DeleteEventInput = req.body;

    const eventToDelete = await db
      .select({ imageUrl: event.imageUrl })
      .from(event)
      .where(eq(event.id, data.id))
      .limit(1);

    if (eventToDelete.length > 0 && eventToDelete[0].imageUrl) {
      deleteOldFile(eventToDelete[0].imageUrl).catch((e) =>
        console.error("Background deletion failed:", e)
      );
    }

    await db.delete(event).where(eq(event.id, data.id));

    return res.json({
      message: "Successfully deleted event with ID: " + data.id,
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
