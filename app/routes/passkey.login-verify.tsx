import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import type { AuthenticationResponseJSON } from "@simplewebauthn/browser";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import {
  getPasskeyByCredentialId,
  updatePasskeyCounter,
} from "../models/passkey.server";
import {
  clearPasskeyChallenge,
  createUserSession,
  getPasskeyChallenge,
  sessionStorage,
} from "../session.server";
import { safeRedirect } from "../utils";

export async function action({ request }: ActionFunctionArgs) {
  const challenge = await getPasskeyChallenge(request);

  if (!challenge) {
    return data({ error: "No challenge found" }, { status: 400 });
  }

  const body = await request.json();
  const { credential, redirectTo, remember } = body as {
    credential: AuthenticationResponseJSON;
    redirectTo?: string;
    remember?: boolean;
  };

  if (!credential || !credential.id) {
    return data({ error: "Invalid credential" }, { status: 400 });
  }

  try {
    const passkey = await getPasskeyByCredentialId(credential.id);

    if (!passkey) {
      return data({ error: "Passkey not found" }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.RP_ORIGIN || "http://localhost:5173",
      expectedRPID: process.env.RP_ID || "localhost",
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports as
          | (
              | "ble"
              | "cable"
              | "hybrid"
              | "internal"
              | "nfc"
              | "smart-card"
              | "usb"
            )[]
          | undefined,
      },
    });

    if (!verification.verified) {
      return data({ error: "Verification failed" }, { status: 400 });
    }

    await updatePasskeyCounter(
      passkey.id,
      BigInt(verification.authenticationInfo.newCounter)
    );

    const session = await clearPasskeyChallenge(request);

    return createUserSession({
      request: new Request(request.url, {
        headers: {
          Cookie: await sessionStorage.commitSession(session),
        },
      }),
      userId: passkey.userId,
      remember: remember ?? false,
      redirectTo: safeRedirect(redirectTo, "/tv"),
    });
  } catch (error) {
    console.error("Passkey authentication error:", error);
    return data({ error: "Failed to authenticate passkey" }, { status: 500 });
  }
}
