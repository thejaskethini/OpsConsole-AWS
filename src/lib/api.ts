import { NextResponse } from "next/server";
import { logger } from "./logger";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
}

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function apiError(
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown
): NextResponse {
  logger.warn(`API Error [${statusCode}]: ${message}`, { code, details });

  return NextResponse.json(
    {
      error: message,
      ...(code ? { code } : {}),
      ...(process.env.NODE_ENV !== "production" && details ? { details } : {}),
    },
    { status: statusCode }
  );
}

/**
 * Classifies AWS error codes into appropriate HTTP status codes and user-friendly messages.
 */
export function handleAwsError(error: unknown, fallbackMessage = "AWS service request failed"): NextResponse {
  const err = error as { name?: string; message?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  const errorName = err?.name || err?.code || "";
  const errorMessage = err?.message || fallbackMessage;

  logger.error(fallbackMessage, error);

  if (
    errorName === "AccessDeniedException" ||
    errorName === "UnauthorizedOperation" ||
    errorName === "AccessDenied"
  ) {
    return NextResponse.json(
      { error: "AWS permissions insufficient for this operation.", code: "AWS_ACCESS_DENIED" },
      { status: 403 }
    );
  }

  if (
    errorName === "ThrottlingException" ||
    errorName === "RequestLimitExceeded" ||
    errorName === "TooManyRequestsException"
  ) {
    return NextResponse.json(
      { error: "AWS rate limit exceeded. Please try again shortly.", code: "AWS_THROTTLED" },
      { status: 429 }
    );
  }

  if (errorName === "ResourceNotFoundException" || errorName === "NoSuchEntity") {
    return NextResponse.json(
      { error: "Requested resource not found.", code: "AWS_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { error: errorMessage },
    { status: err?.$metadata?.httpStatusCode || 500 }
  );
}
