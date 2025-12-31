import { getCorrelationId, getUserId } from "./request-context.server";

type LogContext = Record<string, unknown>;

interface ErrorDetails {
  message: string;
  stack?: string;
  cause?: unknown;
}

function formatError(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    const details: ErrorDetails = {
      message: error.message,
      stack: error.stack,
    };
    if ("cause" in error) {
      details.cause = error.cause;
    }
    return details;
  }

  return {
    message: String(error),
  };
}

export function logError(
  message: string,
  context: LogContext = {},
  error?: unknown
): void {
  const correlationId = getCorrelationId();
  const userId = getUserId();

  const logData = {
    meta: {
      timestamp: new Date().toISOString(),
      level: "error",
      correlationId,
      environment: process.env.ENVIRONMENT_NAME || "development",
      ...(userId ? { userId } : {}),
    },
    message,
    context,
    ...(error ? { error: formatError(error) } : {}),
  };

  console.error(JSON.stringify(logData, null, 2));
}

export function logInfo(message: string, context: LogContext = {}): void {
  const correlationId = getCorrelationId();
  const userId = getUserId();

  const logData = {
    meta: {
      timestamp: new Date().toISOString(),
      level: "info",
      correlationId,
      environment: process.env.ENVIRONMENT_NAME || "development",
      ...(userId ? { userId } : {}),
    },
    message,
    context,
  };

  console.log(JSON.stringify(logData, null, 2));
}
