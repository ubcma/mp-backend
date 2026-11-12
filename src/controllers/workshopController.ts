import { Request, Response } from "express";
import { db } from "../db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { eventRegistration, workshop, workshopRegistration } from "../db/schema/event";
import {
  assertEventNotStarted,
  assertWorkshopSelection,
  getEventOrThrow,
  getSessionUserId,
  parseWorkshopInput,
} from "../lib/registrationChecks";
import { httpError, sendHttpError } from "../lib/utils";
import { validateAdmin } from "../lib/validateSession";
import { Workshop, WorkshopSelection } from "../types/event";

export const getEventWorkshops = async (req: Request, res: Response) => {
  try {
    const userId = await getSessionUserId(req);
    const { id: eventId } = await getEventOrThrow(Number(req.params.id));

    const rows = await db
      .select({
        id: workshop.id,
        eventId: workshop.eventId,
        slot: workshop.slot,
        title: workshop.title,
        description: workshop.description,
        capacity: workshop.capacity,
        sortOrder: workshop.sortOrder,
        registeredCount: sql<number>`count(${workshopRegistration.id})::int`,
      })
      .from(workshop)
      .leftJoin(workshopRegistration, eq(workshopRegistration.workshopId, workshop.id))
      .where(eq(workshop.eventId, eventId))
      .groupBy(workshop.id)
      .orderBy(asc(workshop.slot), asc(workshop.sortOrder), asc(workshop.id));

    const workshops: Workshop[] = rows.map((w) => ({
      ...w,
      isFull: w.registeredCount >= w.capacity,
    }));

    const picks = await db
      .select({ slot: workshopRegistration.slot, workshopId: workshopRegistration.workshopId })
      .from(workshopRegistration)
      .innerJoin(eventRegistration, eq(workshopRegistration.registrationId, eventRegistration.id))
      .where(and(eq(eventRegistration.eventId, eventId), eq(eventRegistration.userId, userId)));

    const mySelection: WorkshopSelection | null = picks.length
      ? Object.fromEntries(picks.map((p) => [String(p.slot), p.workshopId]))
      : null;

    return res.status(200).json({ workshops, mySelection });
  } catch (error) {
    return sendHttpError(res, error, "Error fetching event workshops:");
  }
};

export const setWorkshopSelection = async (req: Request, res: Response) => {
  try {
    const userId = await getSessionUserId(req);
    const evt = await getEventOrThrow(Number(req.params.id));

    const rawRegistrationId = req.body?.registrationId;
    const isAdminEdit = rawRegistrationId != null;
    let registrationId: number | null = null;

    if (isAdminEdit) {
      await assertAdmin(userId);
      if (!Number.isInteger(rawRegistrationId)) {
        throw httpError(400, "invalid_registration_id", "registrationId must be an integer");
      }
      registrationId = rawRegistrationId;
    } else {
      assertEventNotStarted(evt);
    }

    const desired = await assertWorkshopSelection(
      evt.id,
      isAdminEdit ? req.body?.selectionsBySlot : req.body?.workshopIds,
      { allowClear: isAdminEdit }
    );

    const picks = await db.transaction(async (tx) => {
      const registrationWhere = isAdminEdit
        ? and(
            eq(eventRegistration.eventId, evt.id),
            eq(eventRegistration.id, registrationId as number)
          )
        : and(eq(eventRegistration.eventId, evt.id), eq(eventRegistration.userId, userId));

      const [registration] = await tx
        .select({ id: eventRegistration.id, status: eventRegistration.status })
        .from(eventRegistration)
        .where(registrationWhere)
        .limit(1)
        .for("update");

      if (!registration) {
        throw isAdminEdit
          ? httpError(404, "registration_not_found", "Registration not found")
          : httpError(403, "not_registered", "Register for this event before picking workshops");
      }
      if (!isAdminEdit && registration.status === "checkedIn") {
        throw httpError(409, "already_checked_in", "Workshop picks can't be changed after check-in");
      }

      const targetIds = desired
        .map((pick) => pick.workshopId)
        .filter((id): id is number => id != null);

      // Lock in id order so concurrent requests for overlapping workshops can't deadlock.
      const targets = targetIds.length
        ? await tx
            .select({ id: workshop.id, capacity: workshop.capacity })
            .from(workshop)
            .where(inArray(workshop.id, targetIds))
            .orderBy(asc(workshop.id))
            .for("update")
        : [];

      const existing = await tx
        .select({ id: workshopRegistration.id, slot: workshopRegistration.slot, workshopId: workshopRegistration.workshopId })
        .from(workshopRegistration)
        .where(eq(workshopRegistration.registrationId, registration.id));

      const changes = desired
        .map((pick) => ({ ...pick, current: existing.find((row) => row.slot === pick.slot) }))
        .filter((pick) => (pick.current?.workshopId ?? null) !== pick.workshopId);

      for (const change of changes) {
        if (change.workshopId == null) continue;

        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(workshopRegistration)
          .where(eq(workshopRegistration.workshopId, change.workshopId));

        const capacity = targets.find((target) => target.id === change.workshopId)!.capacity;
        if (count >= capacity) {
          throw httpError(409, "workshop_full", "One of the selected workshops is full");
        }
      }

      for (const change of changes) {
        if (change.workshopId == null) {
          if (change.current) {
            await tx
              .delete(workshopRegistration)
              .where(eq(workshopRegistration.id, change.current.id));
          }
          continue;
        }

        if (change.current) {
          await tx
            .update(workshopRegistration)
            .set({ workshopId: change.workshopId, updatedAt: new Date() })
            .where(eq(workshopRegistration.id, change.current.id));
        } else {
          await tx.insert(workshopRegistration).values({
            registrationId: registration.id,
            workshopId: change.workshopId,
            slot: change.slot,
          });
        }
      }

      return tx
        .select({ slot: workshopRegistration.slot, workshopId: workshopRegistration.workshopId })
        .from(workshopRegistration)
        .where(eq(workshopRegistration.registrationId, registration.id));
    });

    const mySelection: WorkshopSelection = Object.fromEntries(
      picks.map((p) => [String(p.slot), p.workshopId])
    );

    return res.status(200).json({ mySelection });
  } catch (error) {
    return sendHttpError(res, error, "Error setting workshop selection:");
  }
};

async function assertAdmin(userId: string) {
  try {
    await validateAdmin(userId);
  } catch {
    throw httpError(403, "forbidden", "Forbidden: Admins only");
  }
}

export const createWorkshop = async (req: Request, res: Response) => {
  try {
    const userId = await getSessionUserId(req);
    await assertAdmin(userId);

    const evt = await getEventOrThrow(Number(req.params.id));
    const input = parseWorkshopInput(req.body, { requireSlot: true });

    const [{ maxSort }] = await db
      .select({ maxSort: sql<number>`coalesce(max(${workshop.sortOrder}), -1)` })
      .from(workshop)
      .where(eq(workshop.eventId, evt.id));

    const [created] = await db
      .insert(workshop)
      .values({
        eventId: evt.id,
        title: input.title,
        description: input.description,
        capacity: input.capacity,
        slot: input.slot,
        sortOrder: Number(maxSort) + 1,
      })
      .returning();

    return res.status(201).json({ workshop: created });
  } catch (error) {
    return sendHttpError(res, error, "Error creating workshop:");
  }
};

export const updateWorkshop = async (req: Request, res: Response) => {
  try {
    const userId = await getSessionUserId(req);
    await assertAdmin(userId);

    const evt = await getEventOrThrow(Number(req.params.id));
    const workshopId = Number(req.params.workshopId);
    if (!Number.isInteger(workshopId)) {
      throw httpError(400, "invalid_workshop_id", "Invalid workshop id");
    }

    const input = parseWorkshopInput(
      { ...req.body, slot: 1 },
      { requireSlot: false }
    );

    const [updated] = await db
      .update(workshop)
      .set({
        title: input.title,
        description: input.description,
        capacity: input.capacity,
        updatedAt: new Date(),
      })
      .where(and(eq(workshop.id, workshopId), eq(workshop.eventId, evt.id)))
      .returning();

    if (!updated) {
      throw httpError(404, "workshop_not_found", "Workshop not found for this event");
    }

    return res.status(200).json({ workshop: updated });
  } catch (error) {
    return sendHttpError(res, error, "Error updating workshop:");
  }
};

export const deleteWorkshop = async (req: Request, res: Response) => {
  try {
    const userId = await getSessionUserId(req);
    await assertAdmin(userId);

    const evt = await getEventOrThrow(Number(req.params.id));
    const workshopId = Number(req.params.workshopId);
    if (!Number.isInteger(workshopId)) {
      throw httpError(400, "invalid_workshop_id", "Invalid workshop id");
    }

    const [deleted] = await db
      .delete(workshop)
      .where(and(eq(workshop.id, workshopId), eq(workshop.eventId, evt.id)))
      .returning({ id: workshop.id });

    if (!deleted) {
      throw httpError(404, "workshop_not_found", "Workshop not found for this event");
    }

    return res.status(200).json({ message: "Workshop deleted" });
  } catch (error) {
    return sendHttpError(res, error, "Error deleting workshop:");
  }
};
