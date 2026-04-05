import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { withRequestContext } from "../request-handler.server";

import { checkRateLimit, getClientIp } from "../rate-limiter.server";
import { sessionStorage, setPasskeyChallenge } from "../session.server";
import { logInfo } from "../logger.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    logInfo("Passkey login options requested", {});

    const ip = getClientIp(request);
    const { limited, retryAfterSeconds } = checkRateLimit(
      `passkey-login:${ip}`,
      10,
      15 * 60 * 1000
    );
    if (limited) {
      return data(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID || "localhost",
      allowCredentials: [],
      userVerification: "preferred",
    });

    const session = await setPasskeyChallenge(request, options.challenge);

    return data(options, {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }
);
