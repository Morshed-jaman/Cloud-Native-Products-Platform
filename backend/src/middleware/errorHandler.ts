import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode =
    error instanceof AppError
      ? error.statusCode
      : typeof error.status === "number"
        ? error.status
        : 500;

  const message =
    error instanceof AppError
      ? error.message
      : statusCode < 500 && typeof error.message === "string"
        ? error.message
        : "Internal server error";

  res.status(statusCode).json({ error: message });
};
