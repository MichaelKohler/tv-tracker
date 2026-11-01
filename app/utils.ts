import { useMatches } from "react-router";
import { useMemo } from "react";

const DEFAULT_REDIRECT = "/";
const REDIRECT_BASE_ORIGIN = "http://redirect-base.invalid";

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT
) {
  if (!to || typeof to !== "string") {
    return defaultRedirect;
  }

  return isSameOriginPath(to) ? to : defaultRedirect;
}

function isSameOriginPath(to: string) {
  if (!to.startsWith("/") || sanitizeInput(to) !== to) {
    return false;
  }

  try {
    const { origin, pathname } = new URL(to, REDIRECT_BASE_ORIGIN);
    return origin === REDIRECT_BASE_ORIGIN && !pathname.startsWith("//");
  } catch {
    return false;
  }
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
  id: string
): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id]
  );
  return route?.loaderData as Record<string, unknown>;
}

export function useIsLoggedIn(): boolean {
  return useMatchesData("root")?.isLoggedIn === true;
}

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 3 && email.includes("@");
}

export function validatePassword(password: unknown): password is string {
  if (typeof password !== "string") {
    return false;
  }

  // Password must be at least 8 characters long
  if (password.length < 8) {
    return false;
  }

  return true;
}

export function getPasswordValidationError(password: unknown): string | null {
  if (typeof password !== "string") {
    return "Password is required";
  }

  if (password.length === 0) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  return null;
}

export function padNumber(number: number) {
  if (number < 10) {
    return `0${number}`;
  }

  return `${number}`;
}

/**
 * Sanitize string input to prevent injection attacks
 * @param input The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes and control characters
  // oxlint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

/**
 * Validate and sanitize email input
 * @param email The email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function validateAndSanitizeEmail(email: unknown): string | null {
  const sanitized = sanitizeInput(email);
  return validateEmail(sanitized) ? sanitized.toLowerCase() : null;
}
