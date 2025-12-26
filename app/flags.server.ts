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
  PASSKEY_REGISTRATION: "passkey-registration",
  UPCOMING_ROUTE: "upcoming-route",
  RECENTLY_WATCHED_ROUTE: "recently-watched",
  STATS_ROUTE: "stats",
  MARK_ALL_AS_WATCHED: "mark-all-as-watched",
  ARCHIVE: "ignore-unwatched-on-overview",
};

export const DEFAULT_FLAG_VALUES: Record<string, boolean> = {
  [FLAGS.MAINTENANCE_MODE]: true,
  [FLAGS.SIGNUP_DISABLED]: false,
  [FLAGS.FETCH_FROM_SOURCE]: false,
  [FLAGS.SEARCH]: false,
  [FLAGS.ADD_SHOW]: false,
  [FLAGS.PASSWORD_CHANGE]: false,
  [FLAGS.DELETE_ACCOUNT]: false,
  [FLAGS.PLEX]: false,
  [FLAGS.UPCOMING_ROUTE]: false,
  [FLAGS.RECENTLY_WATCHED_ROUTE]: false,
  [FLAGS.STATS_ROUTE]: false,
  [FLAGS.MARK_ALL_AS_WATCHED]: false,
  [FLAGS.ARCHIVE]: false,
};

export async function evaluateVariant(request: Request, flag: string) {
  if (process.env.FLIPT_ENVIRONMENT === "") {
    return true;
  }

  try {
    const userId = await getUserId(request);

    const variantEvaluationResponse = await fliptClient.evaluation.variant({
      namespaceKey: "default",
      flagKey: flag,
      entityId: userId || "",
      context: {},
    });

    return variantEvaluationResponse;
  } catch (error) {
    console.error(`Failed to evaluate variant flag ${flag}:`, error);
    return null;
  }
}

export async function evaluateBoolean(request: Request, flag: string) {
  if (process.env.FLIPT_ENVIRONMENT === "") {
    if (flag === FLAGS.SIGNUP_DISABLED) {
      return false;
    }

    return true;
  }

  try {
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

    console.warn(`Flipt returned null for flag ${flag}, using default`);
    return DEFAULT_FLAG_VALUES[flag] ?? false;
  } catch (error) {
    console.error(`Failed to evaluate boolean flag ${flag}:`, error);
    return DEFAULT_FLAG_VALUES[flag] ?? false;
  }
}

export async function evaluateBooleanFromScripts(flag: string) {
  try {
    const booleanEvaluationResponse = await fliptClient.evaluation.boolean({
      namespaceKey: "default",
      flagKey: flag,
      entityId: "scripts",
      context: {},
    });

    if (booleanEvaluationResponse) {
      return booleanEvaluationResponse.enabled;
    }

    console.warn(
      `Flipt returned null for flag ${flag} in scripts, using default`
    );
    return DEFAULT_FLAG_VALUES[flag] ?? false;
  } catch (error) {
    console.error(
      `Failed to evaluate boolean flag ${flag} from scripts:`,
      error
    );
    return DEFAULT_FLAG_VALUES[flag] ?? false;
  }
}
