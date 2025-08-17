import { AuthenticationStrategy, FliptClient } from "@flipt-io/flipt";

import { getUserId } from "./session.server";

class BasicAuthenticationStrategy implements AuthenticationStrategy {
  private clientToken: string;

  public constructor(clientToken: string) {
    this.clientToken = clientToken;
  }

  public authenticate(): Map<string, string> {
    return new Map([["Authorization", `Basic ${this.clientToken}`]]);
  }
}

const authStrategy = new BasicAuthenticationStrategy(
  process.env.FLIPT_TOKEN || ""
);

const fliptClient = new FliptClient({
  url: process.env.FLIPT_URL || "",
  authenticationStrategy: authStrategy,
  headers: {
    "X-Flipt-Environment": process.env.FLIPT_ENVIRONMENT || "",
  },
});

export const FLAGS = {
  // Maintenance mode is inverted, as by default we set all feature flags to true
  MAINTENANCE_MODE: "maintenance-mode-disabled",
  SIGNUP_DISABLED: "signup-disabled",
  FETCH_FROM_SOURCE: "fetch-from-source",
  SEARCH: "search",
  ADD_SHOW: "add-show",
  PASSWORD_CHANGE: "password-change",
  DELETE_ACCOUNT: "delete-account",
  PLEX: "plex",
  UPCOMING_ROUTE: "upcoming-route",
  RECENTLY_WATCHED_ROUTE: "recently-watched",
  STATS_ROUTE: "stats",
  MARK_ALL_AS_WATCHED: "mark-all-as-watched",
  IGNORE_UNWATCHED_ON_OVERVIEW: "ignore-unwatched-on-overview",
};

export async function evaluateVariant(request: Request, flag: string) {
  if (process.env.FLIPT_ENVIRONMENT === "") {
    return true;
  }

  const userId = await getUserId(request);

  const variantEvaluationResponse = await fliptClient.evaluation.variant({
    namespaceKey: "default",
    flagKey: flag,
    entityId: userId || "",
    context: {},
  });

  return variantEvaluationResponse;
}

export async function evaluateBoolean(request: Request, flag: string) {
  if (process.env.FLIPT_ENVIRONMENT === "") {
    if (flag === FLAGS.SIGNUP_DISABLED) {
      return false;
    }

    return true;
  }

  const userId = await getUserId(request);

  const booleanEvaluationResponse = await fliptClient.evaluation.boolean({
    namespaceKey: "default",
    flagKey: flag,
    entityId: userId || "",
    context: {},
  });

  if (booleanEvaluationResponse) {
    return booleanEvaluationResponse.enabled;
  }

  throw new Error("Failed to evaluate boolean flag");
}

export async function evaluateBooleanFromScripts(flag: string) {
  const booleanEvaluationResponse = await fliptClient.evaluation.boolean({
    namespaceKey: "default",
    flagKey: flag,
    entityId: "scripts",
    context: {},
  });

  if (booleanEvaluationResponse) {
    return booleanEvaluationResponse.enabled;
  }

  throw new Error("Failed to evaluate boolean flag from scripts");
}
