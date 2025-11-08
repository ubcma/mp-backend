import { Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
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

export const updateJob = async (req: Request, res: Response) => {
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

    const { id, ...data } = req.body;

    // If company logo changed, delete old one
    const jobToUpdate = await db
      .select({ companyLogo: jobs.companyLogo })
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (jobToUpdate.length > 0 && jobToUpdate[0].companyLogo && data.companyLogo !== jobToUpdate[0].companyLogo) {
      deleteOldFile(jobToUpdate[0].companyLogo).catch((e) =>
        console.error("Background deletion failed:", e)
      );
    }

    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    return res.json({
      message: "Successfully updated job",
      body: updatedJob,
    });
  } catch (error) {
    console.error("Error updating job:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
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

    const { id } = req.body;

    // Delete company logo if exists
    const jobToDelete = await db
      .select({ companyLogo: jobs.companyLogo })
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (jobToDelete.length > 0 && jobToDelete[0].companyLogo) {
      deleteOldFile(jobToDelete[0].companyLogo).catch((e) =>
        console.error("Background deletion failed:", e)
      );
    }

    await db.delete(jobs).where(eq(jobs.id, id));

    return res.json({
      message: "Successfully deleted job with ID: " + id,
    });
  } catch (error) {
    console.error("Error deleting job:", error);
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

    await validateAdmin(userId);

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
