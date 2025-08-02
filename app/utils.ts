import { useMemo } from "react";
import { useMatches } from "react-router";

import type { User } from "./models/user.server";

const DEFAULT_REDIRECT = "/";

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

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
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
  return route?.data as Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUser(user: any): user is User {
  return !!user && typeof user === "object" && typeof user.email === "string";
}

export function useOptionalUser(): User | undefined {
  const data = useMatchesData("root");
  if (!data || !isUser(data.user)) {
    return undefined;
  }
  return data.user;
}

export function useUser(): User {
  const maybeUser = useOptionalUser();
  if (!maybeUser) {
    throw new Error(
      "No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead."
    );
  }
  return maybeUser;
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
  // eslint-disable-next-line no-control-regex
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
