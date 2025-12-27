import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import type { RegistrationResponseJSON } from "@simplewebauthn/browser";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { createPasskey } from "../models/passkey.server";
import {
  clearPasskeyChallenge,
  getPasskeyChallenge,
  requireUser,
  sessionStorage,
} from "../session.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const challenge = await getPasskeyChallenge(request);

  if (!challenge) {
    return data({ error: "No challenge found" }, { status: 400 });
  }

  const body = await request.json();
  const { credential, name } = body as {
    credential: RegistrationResponseJSON;
    name: string;
  };

  if (!name || typeof name !== "string" || name.trim() === "") {
    return data({ error: "Passkey name is required" }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.RP_ORIGIN || "http://localhost:5173",
      expectedRPID: process.env.RP_ID || "localhost",
    });

    if (!verification.verified || !verification.registrationInfo) {
      return data({ error: "Verification failed" }, { status: 400 });
    }

    const { credential: credentialInfo } = verification.registrationInfo;

    await createPasskey({
      userId: user.id,
      credentialId: credentialInfo.id,
      publicKey: new Uint8Array(credentialInfo.publicKey),
      counter: BigInt(credentialInfo.counter),
      transports: credentialInfo.transports || [],
      name: name.trim(),
    });

    const session = await clearPasskeyChallenge(request);

    return data(
      { verified: true },
      {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      }
    );
  } catch (error) {
    console.error("Passkey registration verification error:", error);
    return data({ error: "Failed to verify passkey" }, { status: 500 });
  }
}
