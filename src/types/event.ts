import { QUESTION_TYPES } from "../lib/constants";

export type QuestionType = (typeof QUESTION_TYPES)[number];

export type QuestionInput = {
  id: string;
  label: string;
  placeholder?: string;
  type: QuestionType;
  isRequired: boolean;
  options?: string[];
  validation?: Record<string, any>;
  sortOrder: number;
};

export type Workshop = {
  id: number;
  eventId: number;
  slot: number;
  title: string;
  description: string | null;
  capacity: number;
  sortOrder: number;
  registeredCount: number;
  isFull: boolean;
};

// Keyed by slot number, e.g. { "1": 12, "2": 14 }
export type WorkshopSelection = Record<string, number>;

export type WorkshopInput = {
  title: string;
  description: string | null;
  capacity: number;
  slot: number;
};

export type CreateEventInput = {
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: number;
  location: string;
  isVisible: boolean;
  membersOnly: boolean;
  attendeeCap?: number;
  pricingTier?: string;
  nonMemberPrice: number;
  startsAt: Date;
  endsAt: Date;
  questions: QuestionInput[];
  workshops?: WorkshopInput[];
};

export type UpdateEventInput = {
  id: number;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: number;
  location: string;
  startsAt: Date;
  endsAt: Date;
  isVisible: boolean;
  membersOnly: boolean;
  attendeeCap?: number;
  pricingTier?: string;
  nonMemberPrice: number;
  questions: QuestionInput[];
};

export type DeleteEventInput = {
  id: number;
}
