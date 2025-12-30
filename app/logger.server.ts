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
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: "error",
    message,
    ...context,
    ...(error ? { error: formatError(error) } : {}),
  };

  console.error(JSON.stringify(logData, null, 2));
}

export function logInfo(message: string, context: LogContext = {}): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: "info",
    message,
    ...context,
  };

  console.log(JSON.stringify(logData, null, 2));
}
