/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import AppError from "../error/appError";

const REQUEST_PART_PREFIX = /^(body|query|params|cookies)\.?/;

/**
 * "body.appVersions.0.storeUrl" + "Invalid url" -> "appVersions.0.storeUrl: Invalid url"
 */
const toReadableMessage = (errors: { path: string; message: string }[]) => {
  const messages = errors.map(({ path, message }) => {
    const field = String(path || "").replace(REQUEST_PART_PREFIX, "");
    return field ? `${field}: ${message}` : message;
  });

  return [...new Set(messages)].join(", ") || "Validation Error";
};

const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = err.message || "Internal Server Error";
  let errorMessages = [{ path: "", message }];

  if (err.name === "ValidationError") {
    statusCode = 400;
    errorMessages = Object.values(err.errors).map((el: any) => ({
      path: el.path,
      message: el.message,
    }));
    message = toReadableMessage(errorMessages);
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Cast Error";
    errorMessages = [{ path: err.path, message: "Invalid ID format" }];
  } else if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate Entry";
    errorMessages = [{ path: "", message: err.message }];
  }
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorMessages = err.errors.map((error: any) => ({
      path: error.path.join("."),
      message: error.message,
    }));
    message = toReadableMessage(errorMessages);
  }
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }


  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: err.stack,
  });
};

export default errorMiddleware;
