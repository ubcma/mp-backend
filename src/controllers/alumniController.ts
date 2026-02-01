import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, ilike } from "drizzle-orm";
import { alumniProfiles } from "../db/schema/alumniProfile";

// Get alumni by company name (for job board display)
export const getAlumniByCompany = async (req: Request, res: Response) => {
  try {
    const { company } = req.query;

    if (!company || typeof company !== "string") {
      return res.status(400).json({ message: "Company name is required" });
    }

    const alumni = await db
      .select({
        id: alumniProfiles.id,
        fullName: alumniProfiles.fullName,
        currentCompany: alumniProfiles.currentCompany,
        currentTitle: alumniProfiles.currentTitle,
        graduationYear: alumniProfiles.graduationYear,
        linkedinUrl: alumniProfiles.linkedinUrl,
        contactEmail: alumniProfiles.contactEmail,
      })
      .from(alumniProfiles)
      .where(
        and(
          ilike(alumniProfiles.currentCompany, company),
          eq(alumniProfiles.referralOptIn, true)
        )
      );

    res.status(200).json(alumni);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch alumni" });
  }
};

// Get all opted-in alumni
export const getAllAlumni = async (req: Request, res: Response) => {
  try {
    const alumni = await db
      .select({
        id: alumniProfiles.id,
        fullName: alumniProfiles.fullName,
        currentCompany: alumniProfiles.currentCompany,
        currentTitle: alumniProfiles.currentTitle,
        graduationYear: alumniProfiles.graduationYear,
        linkedinUrl: alumniProfiles.linkedinUrl,
        referralOptIn: alumniProfiles.referralOptIn,
      })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.referralOptIn, true));

    res.status(200).json(alumni);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch alumni" });
  }
};

// Create alumni profile (for admin/script ingestion from Google Forms)
export const createAlumniProfile = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      currentCompany,
      currentTitle,
      graduationYear,
      linkedinUrl,
      contactEmail,
      referralOptIn,
    } = req.body;

    if (!fullName || !currentCompany) {
      return res.status(400).json({ message: "Full name and company are required" });
    }

    const [created] = await db
      .insert(alumniProfiles)
      .values({
        fullName,
        currentCompany,
        currentTitle,
        graduationYear,
        linkedinUrl,
        contactEmail,
        referralOptIn: referralOptIn ?? false,
      })
      .returning();

    return res.json({ message: "Profile created", body: created });
  } catch (error) {
    console.error("Error creating alumni profile:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update alumni profile
export const updateAlumniProfile = async (req: Request, res: Response) => {
  try {
    const { id, ...data } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const [updated] = await db
      .update(alumniProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(alumniProfiles.id, id))
      .returning();

    return res.json({ message: "Profile updated", body: updated });
  } catch (error) {
    console.error("Error updating alumni profile:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete alumni profile
export const deleteAlumniProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    await db.delete(alumniProfiles).where(eq(alumniProfiles.id, id));

    return res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting alumni profile:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
