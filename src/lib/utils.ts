import { Response } from "express";

export function isValidField(value: any) {
    return value !== undefined && value !== null && value !== '';
  }

export type HttpError = Error & { status: number; code: string };

export const httpError = (status: number, code: string, message?: string): HttpError =>
  Object.assign(new Error(message ?? code), { status, code });

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof Error && typeof (err as HttpError).status === "number";
}

// Responds with the error's status for HttpErrors; anything else is logged and returned as a 500.
export function sendHttpError(res: Response, err: unknown, logLabel: string) {
  if (isHttpError(err)) {
    return res.status(err.status).json({ error: err.message, code: err.code, message: err.message });
  }
  console.error(logLabel, err);
  return res.status(500).json({ error: "Internal Server Error" });
}
