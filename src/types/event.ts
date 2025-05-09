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

export type CreateEventInput = {
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: number;
  location: string;
  isVisible: boolean;
  startsAt: Date;
  endsAt: Date;
  questions: QuestionInput[];
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
  questions: QuestionInput[];
};

export type DeleteEventInput = {
  id: number;
}
