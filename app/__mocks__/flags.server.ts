import { vi } from "vite-plus/test";

export const evaluateBoolean = vi.fn();
export const evaluateVariant = vi.fn();
export const evaluateBooleanFromScripts = vi.fn();

export const FLAGS = {
  MAINTENANCE_MODE: "maintenance-mode-disabled",
  SIGNUP_DISABLED: "signup-disabled",
  FETCH_FROM_SOURCE: "fetch-from-source",
  SEARCH: "search",
  ADD_SHOW: "add-show",
  PASSWORD_CHANGE: "password-change",
  DELETE_ACCOUNT: "delete-account",
  PLEX: "plex",
  PASSKEY_REGISTRATION: "passkey-registration",
  UPCOMING_ROUTE: "upcoming-route",
  RECENTLY_WATCHED_ROUTE: "recently-watched",
  STATS_ROUTE: "stats",
  MARK_ALL_AS_WATCHED: "mark-all-as-watched",
  ARCHIVE: "ignore-unwatched-on-overview",
};
