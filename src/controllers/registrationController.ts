import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "../lib/auth";
import { userProfile } from "../db/schema/userProfile";
import { users } from "../db/schema/auth";
import { event, eventRegistration, eventRegistrationResponse, question } from "../db/schema/event";
import { validateAdmin } from "../lib/validateSession";

export const getEventRegistrations = async (req: Request, res: Response) => {
  const { id: eventId } = req.params;

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

    // Verify event exists
    const [eventExists] = await db
      .select()
      .from(event)
      .where(eq(event.id, parseInt(eventId)))
      .limit(1);

    if (!eventExists) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Get all registrations for the event with user details
    const registrations = await db
      .select({
        id: eventRegistration.id,
        userId: eventRegistration.userId,
        status: eventRegistration.status,
        eventId: eventRegistration.eventId,
        stripeTransactionId: eventRegistration.stripeTransactionId,
        registeredAt: eventRegistration.createdAt,
        // User details
        userEmail: users.email,
        userName: users.name,
        userImage: users.image,
        // User profile details
        name: userProfile.name,
        year: userProfile.year,
        faculty: userProfile.faculty,
      })
      .from(eventRegistration)
      .leftJoin(users, eq(eventRegistration.userId, users.id))
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(eq(eventRegistration.eventId, parseInt(eventId)));

    // Get all questions for this event
    const eventQuestions = await db
      .select()
      .from(question)
      .where(eq(question.eventId, parseInt(eventId)))
      .orderBy(question.sortOrder);

    // Get all responses for these registrations
    const signupIds = registrations.map(reg => reg.id);
    const responses = signupIds.length > 0 ? await db
      .select({
        signupId: eventRegistrationResponse.signupId,
        questionId: eventRegistrationResponse.questionId,
        response: eventRegistrationResponse.response,
        questionLabel: question.label,
        questionType: question.type,
      })
      .from(eventRegistrationResponse)
      .leftJoin(question, eq(eventRegistrationResponse.questionId, question.id))
      .where(inArray(eventRegistrationResponse.signupId, signupIds)) : [];

    // Structure the data with responses grouped by registration
    const registrationsWithResponses = registrations.map(registration => {
      const userResponses = responses.filter(resp => resp.signupId === registration.id);
      const responseMap: Record<string, string> = {};
      
      userResponses.forEach(resp => {
        if (resp.questionLabel) {
          responseMap[resp.questionLabel] = resp.response;
        }
      });

      return {
        ...registration,
        responses: responseMap,
      };
    });

    return res.status(200).json({
      registrations: registrationsWithResponses,
      questions: eventQuestions,
    });
  } catch (error) {
    console.error("Error fetching event registrations:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createRegistration = async (req: Request, res: Response) => {
  const { id: eventId } = req.params;

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

    // Verify event exists
    const [eventExists] = await db
      .select()
      .from(event)
      .where(eq(event.id, parseInt(eventId)))
      .limit(1);

    if (!eventExists) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if user is already registered for this event
    const [existingRegistration] = await db
      .select()
      .from(eventRegistration)
      .where(
        and(
          eq(eventRegistration.eventId, parseInt(eventId)),
          eq(eventRegistration.userId, userId)
        )
      )
      .limit(1);

    if (existingRegistration) {
      return res.status(409).json({ error: "Already registered for this event" });
    }

    const { responses, stripeTransactionId } = req.body;

    // Create the signup
    const [newSignup] = await db
      .insert(eventRegistration)
      .values({
        userId: userId,
        eventId: parseInt(eventId),
        stripeTransactionId: stripeTransactionId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // If there are form responses, save them
    if (responses && Array.isArray(responses)) {
      const responseValues = responses.map((resp: { questionId: number, response: string }) => ({
        signupId: newSignup.id,
        questionId: resp.questionId,
        response: resp.response,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (responseValues.length > 0) {
        await db.insert(eventRegistrationResponse).values(responseValues);
      }
    }

    return res.status(201).json({
      message: "Successfully registered for event",
      signup: newSignup,
    });
  } catch (error) {
    console.error("Error creating registration:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getRegistrationById = async (req: Request, res: Response) => {
  const { id: eventId, registrationId } = req.params;

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

    // Check if user is admin or the owner of the registration
    const [user] = await db
      .select({
        userRole: userProfile.role,
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(eq(users.id, userId))
      .limit(1);

    const userRole = user?.userRole;

    // Get the registration with user details
    const [registrationData] = await db
      .select({
        id: eventRegistration.id,
        userId: eventRegistration.userId,
        eventId: eventRegistration.eventId,
        stripeTransactionId: eventRegistration.stripeTransactionId,
        registeredAt: eventRegistration.createdAt,
        // User details
        userEmail: users.email,
        userName: users.name,
        userImage: users.image,
        // User profile details
        name: userProfile.name,
        year: userProfile.year,
        faculty: userProfile.faculty,
      })
      .from(eventRegistration)
      .leftJoin(users, eq(eventRegistration.userId, users.id))
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(
        and(
          eq(eventRegistration.id, parseInt(registrationId)),
          eq(eventRegistration.eventId, parseInt(eventId))
        )
      )
      .limit(1);

    if (!registrationData) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Check if user has permission to view this registration
    if (userRole !== "Admin" && registrationData.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: Cannot view other users' registrations" });
    }

    // Get the responses for this registration
    const responses = await db
      .select({
        questionId: eventRegistrationResponse.questionId,
        response: eventRegistrationResponse.response,
        questionLabel: question.label,
        questionType: question.type,
      })
      .from(eventRegistrationResponse)
      .leftJoin(question, eq(eventRegistrationResponse.questionId, question.id))
      .where(eq(eventRegistrationResponse.signupId, parseInt(registrationId)));

    const responseMap: Record<string, string> = {};
    responses.forEach(resp => {
      if (resp.questionLabel) {
        responseMap[resp.questionLabel] = resp.response;
      }
    });

    return res.status(200).json({
      ...registrationData,
      responses: responseMap,
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateRegistration = async (req: Request, res: Response) => {
  const { id: eventId, registrationId } = req.params;

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

    // Check if user is admin
    const [user] = await db
      .select({
        userRole: userProfile.role,
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.userId))
      .where(eq(users.id, userId))
      .limit(1);

    const userRole = user?.userRole;

    // For now, only admins can update registrations
    if (userRole !== "Admin") {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }

    // Verify registration exists
    const [existingRegistration] = await db
      .select()
      .from(eventRegistration)
      .where(
        and(
          eq(eventRegistration.id, parseInt(registrationId)),
          eq(eventRegistration.eventId, parseInt(eventId))
        )
      )
      .limit(1);

    if (!existingRegistration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const { responses, stripeTransactionId } = req.body;

    const { status } = req.body;

    // Update the signup record
    const updateData: any = {
      status: status,
      updatedAt: new Date(),
    };

    if (stripeTransactionId !== undefined) {
      updateData.stripeTransactionId = stripeTransactionId;
    }

    const [updatedSignup] = await db
      .update(eventRegistration)
      .set(updateData)
      .where(
        and(
          eq(eventRegistration.id, parseInt(registrationId)),
          eq(eventRegistration.eventId, parseInt(eventId))
        )
      )
      .returning();

    // Update responses if provided
    if (responses && Array.isArray(responses)) {
      // Delete existing responses for this signup
      await db
        .delete(eventRegistrationResponse)
        .where(eq(eventRegistrationResponse.signupId, parseInt(registrationId)));

      // Insert new responses
      const responseValues = responses.map((resp: { questionId: number, response: string }) => ({
        signupId: parseInt(registrationId),
        questionId: resp.questionId,
        response: resp.response,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (responseValues.length > 0) {
        await db.insert(eventRegistrationResponse).values(responseValues);
      }
    }

    return res.status(200).json({
      message: "Successfully updated registration",
      signup: updatedSignup,
    });
  } catch (error) {
    console.error("Error updating registration:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserRegistrations = async (req: Request, res: Response) => {
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

    // Fetch all registrations for the user
    const registrations = await db
      .select({
        id: eventRegistration.id,
        eventId: eventRegistration.eventId,
        status: eventRegistration.status,
        stripeTransactionId: eventRegistration.stripeTransactionId,
        registeredAt: eventRegistration.createdAt,
        // Event details
        eventTitle: event.title,
        eventStartsAt: event.startsAt,
        eventEndsAt: event.endsAt,
        eventLocation: event.location,
      })
      .from(eventRegistration)
      .leftJoin(event, eq(eventRegistration.eventId, event.id))
      .where(eq(eventRegistration.userId, userId));

      if (registrations.length === 0) {
        return res.status(200).json({
        registrations: []
      });
    }

    // Get all responses for these registrations
    const registrationIds = registrations.map((reg) => reg.id);
    const responses =
      registrationIds.length > 0
        ? await db
            .select({
              signupId: eventRegistrationResponse.signupId,
              questionId: eventRegistrationResponse.questionId,
              response: eventRegistrationResponse.response,
              questionLabel: question.label,
              questionType: question.type,
            })
            .from(eventRegistrationResponse)
            .leftJoin(question, eq(eventRegistrationResponse.questionId, question.id))
            .where(inArray(eventRegistrationResponse.signupId, registrationIds))
        : [];

    // Structure the data with responses grouped by registration
    const registrationsWithResponses = registrations.map((registration) => {
      const userResponses = responses.filter(
        (resp) => resp.signupId === registration.id
      );
      const responseMap: Record<string, string> = {};

      userResponses.forEach((resp) => {
        if (resp.questionLabel) {
          responseMap[resp.questionLabel] = resp.response;
        }
      });

      return {
        ...registration,
        responses: responseMap,
      };
    });

    return res.status(200).json({
      registrations: registrationsWithResponses,
    });
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};