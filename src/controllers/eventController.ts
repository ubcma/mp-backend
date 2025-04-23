import { Request, Response } from "express";
import { db } from "../db";
import {
  eventQuestions,
  events,
  signupAnswers,
  signups,
} from "../db/schema/events";
import { eq } from "drizzle-orm";

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const allEvents = await db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        time: events.time,
        price: events.price,
        tags: events.tags,
        description: events.description,
        imageUrl: events.imageUrl,
      })
      .from(events);

    res.status(200).json(allEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

export const getEventDetails = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  try {
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const questions = await db
      .select()
      .from(eventQuestions)
      .where(eq(eventQuestions.eventId, eventId));

    res.status(200).json({
      ...event[0],
      questions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch event details" });
  }
};

export const getEventSignups = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  try {
    const eventSignups = await db
      .select()
      .from(signups)
      .where(eq(signups.eventId, eventId));

    const result = await Promise.all(
      eventSignups.map(async (signup) => {
        const answers = await db
          .select({
            answer: signupAnswers.answer,
            questionId: signupAnswers.questionId,
          })
          .from(signupAnswers)
          .where(eq(signupAnswers.signupId, signup.id));

        // Get corresponding question texts
        const detailedAnswers = await Promise.all(
          answers.map(async (ans) => {
            if (!ans.questionId) {
              return {
                question: "Unknown Question",
                answer: ans.answer,
              };
            }

            const question = await db
              .select({ text: eventQuestions.questionText })
              .from(eventQuestions)
              .where(eq(eventQuestions.id, ans.questionId))
              .limit(1);
            return {
              question: question[0]?.text || "Unknown Question",
              answer: ans.answer,
            };
          })
        );

        return {
          attendeeEmail: signup.attendeeEmail,
          answers: detailedAnswers,
        };
      })
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch signups" });
  }
};

// 4. Get events a user signed up for
export const getUserSignups = async (req: Request, res: Response) => {
  const { userEmail } = req.params;

  try {
    const userSignups = await db
      .select({
        signupId: signups.id,
        eventId: signups.eventId,
        createdAt: signups.createdAt,
      })
      .from(signups)
      .where(eq(signups.attendeeEmail, userEmail));

    // Attach event titles
    const result = await Promise.all(
      userSignups.map(async (signup) => {
        if (!signup.eventId) {
          return {
            eventId: "Unknown Event",
            eventTitle: "Unknown Event",
            signupDate: signup.createdAt,
          };
        }

        const event = await db
          .select({ title: events.title })
          .from(events)
          .where(eq(events.id, signup.eventId))
          .limit(1);

        return {
          eventId: signup.eventId,
          eventTitle: event[0]?.title || "Unknown Event",
          signupDate: signup.createdAt,
        };
      })
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch user signups" });
  }
};

// 5. Create a signup for an event
export const createSignup = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { attendeeEmail, answers } = req.body; // answers = [{ questionId, answer }]

  try {
    const [newSignup] = await db
      .insert(signups)
      .values({
        eventId,
        attendeeEmail,
      })
      .returning({ id: signups.id });

    await db.insert(signupAnswers).values(
      answers.map((ans: { questionId: string; answer: string }) => ({
        signupId: newSignup.id,
        questionId: ans.questionId,
        answer: ans.answer,
      }))
    );

    res.status(201).json({ message: "Signup completed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create signup" });
  }
};
