import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

interface RequestContext {
  correlationId: string;
  userId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  const context = asyncLocalStorage.getStore();
  if (!context) {
    return {
      correlationId: "no-context",
    };
  }
  return context;
}

export function getCorrelationId(): string {
  return getRequestContext().correlationId;
}

export function getUserId(): string | undefined {
  return getRequestContext().userId;
}

export function setUserId(userId: string | undefined): void {
  const context = asyncLocalStorage.getStore();
  if (context) {
    context.userId = userId;
  }
}

export function runWithRequestContext<T>(
  request: Request,
  callback: () => T
): T {
  const CORRELATION_ID_HEADER = "x-correlation-id";
  const correlationId =
    request.headers.get(CORRELATION_ID_HEADER) || randomUUID();

  const context: RequestContext = {
    correlationId,
  };

  return asyncLocalStorage.run(context, callback);
}
