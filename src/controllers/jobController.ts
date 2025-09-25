import { Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { event, eventTag, question, tag } from "../db/schema/event";
import { auth } from "../lib/auth";
import { userProfile, userRoleEnum } from "../db/schema/userProfile";
import { users } from "../db/schema/auth";
import {
  CreateEventInput,
  DeleteEventInput,
  QuestionInput,
  UpdateEventInput,
} from "../types/event";
import { deleteOldFile } from "../lib/uploadthing";
import { validateAdmin } from "../lib/validateSession";
import { jobs } from "../db/schema/job";
import { CreateJobInput } from "../types/job";

export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const allJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        companyName: jobs.companyName,
        companyLogo: jobs.companyLogo,
        description: jobs.description,
        type: jobs.type,
        location: jobs.location,
        applicationType: jobs.applicationType,
        applicationUrl: jobs.applicationUrl,
        applicationEmail: jobs.applicationEmail,
        applicationText: jobs.applicationText,
        postedAt: jobs.postedAt,
        updatedAt: jobs.updatedAt,
        isActive: jobs.isActive,
      })
      .from(jobs);

    res.status(200).json(allJobs);
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
      .select()
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
      tags: tagRows.map((t) => t.name),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createJob = async (req: Request, res: Response) => {
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

    validateAdmin(userId);

    const data: CreateJobInput = req.body;

    const [jobRecord] = await db
      .insert(jobs)
      .values({
        title: data.title,
        companyName: data.companyName,
        companyLogo: data.companyLogo,
        description: data.description,
        type: data.type,
        location: data.location,
        applicationType: data.applicationType,
        applicationUrl: data.applicationUrl,
        applicationEmail: data.applicationEmail,
        applicationText: data.applicationText,
        postedAt: new Date(),
        updatedAt: new Date(),
        isActive: data.isActive,
      })
      .returning();

    return res.json({
      message: "Successfully created job",
      body: jobRecord,
    });
  } catch (error) {
    console.error("Error creating job:", error);
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

    validateAdmin(userId);

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

    validateAdmin(userId);

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
