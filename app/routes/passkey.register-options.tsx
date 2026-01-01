import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import type { AuthenticatorTransport } from "@simplewebauthn/browser";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import { getPasskeysByUserId } from "../models/passkey.server";
import {
  requireUser,
  sessionStorage,
  setPasskeyChallenge,
} from "../session.server";
import { logInfo } from "../logger.server";
import { withRequestContext } from "../request-handler.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    logInfo("Passkey registration options requested", {});

    const user = await requireUser(request);

    const existingPasskeys = await getPasskeysByUserId(user.id);

    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME || "TV Tracker",
      rpID: process.env.RP_ID || "localhost",
      userName: user.email,
      userDisplayName: user.email,
      attestationType: "none",
      excludeCredentials: existingPasskeys.map(
        (passkey: (typeof existingPasskeys)[number]) => ({
          id: passkey.credentialId,
          transports: passkey.transports as AuthenticatorTransport[],
        })
      ),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    const session = await setPasskeyChallenge(request, options.challenge);

    return data(options, {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }
);
