import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { withRequestContext } from "../request-handler.server";

import {
  createPasskey,
  verifyPasskeyAuthentication,
} from "../models/passkey.server";
import { userHasPassword, verifyLogin } from "../models/user.server";
import {
  clearPasskeyChallenge,
  clearPasskeyReauthChallenge,
  getPasskeyChallenge,
  getPasskeyReauthChallenge,
  requireUser,
  sessionStorage,
} from "../session.server";
import { logInfo } from "../logger.server";
import { sendPasskeyCreatedMail } from "../models/mail.server";

export const action = withRequestContext(
  async ({ request }: ActionFunctionArgs) => {
    logInfo("Passkey registration verification started", {});

    const user = await requireUser(request);
    const challenge = await getPasskeyChallenge(request);

    if (!challenge) {
      return data({ error: "No challenge found" }, { status: 400 });
    }

    const body = await request.json();
    const { credential, name, password, passkeyCredential } = body as {
      credential: RegistrationResponseJSON;
      name: string;
      password?: string;
      passkeyCredential?: AuthenticationResponseJSON;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return data({ error: "Passkey name is required" }, { status: 400 });
    }

    const hasPassword = await userHasPassword(user.id);

    if (hasPassword) {
      if (!password || typeof password !== "string" || password.trim() === "") {
        return data(
          { error: "Password is required to register a new passkey" },
          { status: 400 }
        );
      }

      const isValid = await verifyLogin(user.email, password);
      if (!isValid) {
        return data({ error: "Incorrect password" }, { status: 401 });
      }
    } else {
      if (!passkeyCredential) {
        return data(
          {
            error:
              "Passkey authentication is required to register a new passkey",
          },
          { status: 400 }
        );
      }

      const reauthChallenge = await getPasskeyReauthChallenge(request);
      if (!reauthChallenge) {
        return data(
          { error: "No authentication challenge found. Please try again." },
          { status: 400 }
        );
      }

      const verification = await verifyPasskeyAuthentication(
        passkeyCredential,
        reauthChallenge,
        user.id
      );

      if (!verification.success) {
        return data(
          { error: verification.error || "Passkey authentication failed" },
          { status: 400 }
        );
      }
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

      const passkey = await createPasskey({
        userId: user.id,
        credentialId: credentialInfo.id,
        publicKey: new Uint8Array(credentialInfo.publicKey),
        counter: BigInt(credentialInfo.counter),
        transports: credentialInfo.transports || [],
        name: name.trim(),
      });

      await sendPasskeyCreatedMail({
        email: user.email,
        passkeyName: passkey.name,
        createdAt: passkey.createdAt,
      });

      const session = await clearPasskeyChallenge(request);
      await clearPasskeyReauthChallenge(request);

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
);
