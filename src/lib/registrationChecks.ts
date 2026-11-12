import { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { auth } from "./auth";
import { httpError } from "./utils";
import { ONBOARDING_REQUIRED_EVENT_SLUGS } from "./constants";
import { event, workshop } from "../db/schema/event";
import { userProfile } from "../db/schema/userProfile";
import { WorkshopInput } from "../types/event";

export const WORKSHOP_DESCRIPTION_MAX = 300;

export type EventRecord = typeof event.$inferSelect;
export type UserProfileSummary = Awaited<ReturnType<typeof getUserProfileOrThrow>>;

export async function getSessionUserId(req: Request) {
  const headers = new Headers();
  if (req.headers.cookie) {
    headers.append("cookie", req.headers.cookie);
  }

  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw httpError(401, "unauthorized", "Unauthorized");
  }
  return session.user.id;
}

export async function getEventOrThrow(eventId: number) {
  if (!Number.isInteger(eventId)) {
    throw httpError(400, "invalid_event_id", "Invalid event id");
  }

  const [evt] = await db.select().from(event).where(eq(event.id, eventId)).limit(1);
  if (!evt) {
    throw httpError(404, "event_not_found", "Event not found");
  }
  return evt;
}

export function assertEventNotStarted(evt: EventRecord) {
  if (evt.startsAt <= new Date()) {
    throw httpError(409, "registration_closed", "Registration for this event has closed");
  }
}

export async function getUserProfileOrThrow(userId: string) {
  const [profile] = await db
    .select({
      role: userProfile.role,
      onboardingComplete: userProfile.onboardingComplete,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  if (!profile) {
    throw httpError(404, "profile_not_found", "User profile not found");
  }
  return profile;
}

export function requiresOnboarding(evt: EventRecord) {
  return ONBOARDING_REQUIRED_EVENT_SLUGS.includes(evt.slug);
}

export function assertOnboardingComplete(profile: UserProfileSummary) {
  if (!profile.onboardingComplete) {
    throw httpError(403, "onboarding_incomplete", "Complete your onboarding to register for this event");
  }
}

export function assertMemberIfRequired(evt: EventRecord, profile: UserProfileSummary) {
  if (evt.membersOnly && profile.role !== "Member" && profile.role !== "Admin") {
    throw httpError(403, "members_only", "This event is for members only");
  }
}

// Mirrors the pricing in createPaymentIntent: Basic users pay nonMemberPrice, everyone else pays price.
export function assertFreeForUser(evt: EventRecord, profile: UserProfileSummary) {
  const price = profile.role === "Basic" ? evt.nonMemberPrice : evt.price;
  if (Number(price) > 0) {
    throw httpError(402, "payment_required", "This event requires payment");
  }
}

export function parseWorkshopInput(
  body: unknown,
  options: { requireSlot: boolean }
): WorkshopInput {
  if (!body || typeof body !== "object") {
    throw httpError(400, "invalid_workshop", "Invalid workshop");
  }

  const { title, description, capacity, slot } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    throw httpError(400, "invalid_workshop", "Title is required");
  }
  if (description != null && typeof description !== "string") {
    throw httpError(400, "invalid_workshop", "Description must be text");
  }
  if (typeof description === "string" && description.length > WORKSHOP_DESCRIPTION_MAX) {
    throw httpError(400, "invalid_workshop", `Description must be ${WORKSHOP_DESCRIPTION_MAX} characters or fewer`);
  }

  const parsedCapacity = Number(capacity);
  if (!Number.isInteger(parsedCapacity) || parsedCapacity < 0) {
    throw httpError(400, "invalid_workshop", "Capacity must be a whole number of 0 or more");
  }

  const parsedSlot = Number(slot);
  if (options.requireSlot && (!Number.isInteger(parsedSlot) || parsedSlot < 1)) {
    throw httpError(400, "invalid_workshop", "Slot must be a whole number of 1 or more");
  }

  return {
    title: title.trim(),
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    capacity: parsedCapacity,
    slot: parsedSlot,
  };
}

export type WorkshopSlotPick = { slot: number; workshopId: number | null };

// Attendees pass workshopIds. Admins pass selectionsBySlot and may use null to clear a slot.
export async function assertWorkshopSelection(
  eventId: number,
  selection: unknown,
  options?: { allowClear?: boolean }
): Promise<WorkshopSlotPick[]> {
  const allowClear = options?.allowClear ?? false;
  const workshops = await db
    .select({ id: workshop.id, slot: workshop.slot })
    .from(workshop)
    .where(eq(workshop.eventId, eventId));

  const slots = [...new Set(workshops.map((row) => row.slot))].sort((a, b) => a - b);
  const picks = allowClear
    ? parseSelectionsBySlot(selection, slots)
    : parseWorkshopIds(selection, workshops);

  const ids = picks
    .map((pick) => pick.workshopId)
    .filter((id): id is number => id != null);
  if (new Set(ids).size !== ids.length) {
    throw httpError(400, "invalid_selection", "Each workshop can only be picked once");
  }

  const byId = new Map(workshops.map((row) => [row.id, row]));
  if (ids.some((id) => !byId.has(id))) {
    throw httpError(404, "workshop_not_found", "One or more workshops were not found for this event");
  }

  const covered = new Set<number>();
  for (const pick of picks) {
    if (pick.workshopId == null) continue;
    const match = byId.get(pick.workshopId)!;
    if (match.slot !== pick.slot || covered.has(pick.slot)) {
      throw httpError(400, "invalid_selection", "Pick only one workshop per slot");
    }
    covered.add(pick.slot);
  }

  if (!allowClear && covered.size !== slots.length) {
    throw httpError(400, "invalid_selection", "Pick one workshop for every slot");
  }

  return picks;
}

function parseWorkshopIds(
  workshopIds: unknown,
  workshops: { id: number; slot: number }[]
): WorkshopSlotPick[] {
  if (
    !Array.isArray(workshopIds) ||
    workshopIds.length === 0 ||
    !workshopIds.every((id) => Number.isInteger(id))
  ) {
    throw httpError(400, "invalid_selection", "workshopIds must be a non-empty array of workshop ids");
  }

  const byId = new Map(workshops.map((row) => [row.id, row.slot]));
  return (workshopIds as number[]).map((id) => ({
    slot: byId.get(id) ?? -1,
    workshopId: id,
  }));
}

function parseSelectionsBySlot(selection: unknown, slots: number[]): WorkshopSlotPick[] {
  if (selection == null || typeof selection !== "object" || Array.isArray(selection)) {
    throw httpError(400, "invalid_selection", "selectionsBySlot must include every workshop slot");
  }

  const input = selection as Record<string, unknown>;
  const expected = new Set(slots.map(String));
  for (const key of Object.keys(input)) {
    if (!expected.has(key)) {
      throw httpError(400, "invalid_selection", `Unknown workshop slot ${key}`);
    }
  }

  return slots.map((slot) => {
    const key = String(slot);
    if (!(key in input)) {
      throw httpError(400, "invalid_selection", `Missing selection for slot ${slot}`);
    }

    const value = input[key];
    if (value === null) return { slot, workshopId: null };
    if (!Number.isInteger(value)) {
      throw httpError(400, "invalid_selection", `Slot ${slot} must be a workshop id or null`);
    }
    return { slot, workshopId: value as number };
  });
}
