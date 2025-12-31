import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { runWithRequestContext } from "./request-context.server";

/**
 * Wraps a loader function with request context initialization.
 * This ensures correlationId and userId are available in the async context
 * for logging and tracing throughout the request lifecycle.
 */
export function withRequestContext<T>(
  handler: (args: LoaderFunctionArgs | ActionFunctionArgs) => T
) {
  return (args: LoaderFunctionArgs | ActionFunctionArgs): T => {
    return runWithRequestContext(args.request, () => handler(args));
  };
}
