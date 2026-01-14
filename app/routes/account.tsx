import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, useLoaderData, useSearchParams } from "react-router";
import type { AuthenticationResponseJSON } from "@simplewebauthn/browser";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { withRequestContext } from "../request-handler.server";

import { DeleteAccount } from "../components/delete-account";
import { PasskeyList } from "../components/passkey-list";
import { PasskeyRegistration } from "../components/passkey-registration";
import { PasswordChangeForm } from "../components/password-change-form";
import { PasswordRemove } from "../components/password-remove";
import { PlexWebhook } from "../components/plex-webhook";
import { evaluateBoolean, FLAGS } from "../flags.server";
import {
  deletePasskey,
  getPasskeyByCredentialId,
  getPasskeysByUserId,
  updatePasskeyCounter,
  updatePasskeyName,
} from "../models/passkey.server";
import {
  changePassword,
  removePassword,
  userHasPassword,
  verifyLogin,
} from "../models/user.server";
import {
  clearPasskeyChallenge,
  getPasskeyChallenge,
  requireUser,
} from "../session.server";
import { getPasswordValidationError } from "../utils";
import { logInfo, logError } from "../logger.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (token) {
      logInfo("Account page accessed with password reset token", {});
      // We need to short-curcuit everything and allow the change of password
      return {
        webhookUrl: null,
        passkeys: [],
        features: {
          passwordChange: await evaluateBoolean(request, FLAGS.PASSWORD_CHANGE),
          passkeyRegistration: false,
          deleteAccount: false,
          plex: false,
        },
        hasPassword: true,
      };
    }

    const user = await requireUser(request);
    logInfo("Account page accessed", {});
    const webhookUrl = url.origin + "/plex/" + user.plexToken;

    const features = {
      passwordChange: await evaluateBoolean(request, FLAGS.PASSWORD_CHANGE),
      passkeyRegistration: await evaluateBoolean(
        request,
        FLAGS.PASSKEY_REGISTRATION
      ),
      deleteAccount: await evaluateBoolean(request, FLAGS.DELETE_ACCOUNT),
      plex: await evaluateBoolean(request, FLAGS.PLEX),
    };

    const passkeys = await getPasskeysByUserId(user.id);

    const sanitizedPasskeys = passkeys.map(
      (passkey: (typeof passkeys)[number]) => ({
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt,
        lastUsedAt: passkey.lastUsedAt,
      })
    );

    const hasPassword = await userHasPassword(user.id);

    return {
      webhookUrl,
      passkeys: sanitizedPasskeys,
      features,
      hasPassword,
    };
  }
);

async function verifyPasskeyCredential(
  request: Request,
  credentialJSON: AuthenticationResponseJSON,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const challenge = await getPasskeyChallenge(request);

  if (!challenge) {
    return { success: false, error: "No challenge found" };
  }

  if (!credentialJSON || !credentialJSON.id) {
    return { success: false, error: "Invalid credential" };
  }

  try {
    const passkey = await getPasskeyByCredentialId(credentialJSON.id);

    if (!passkey) {
      return { success: false, error: "Passkey not found" };
    }

    if (passkey.userId !== userId) {
      return { success: false, error: "Passkey does not belong to user" };
    }

    const verification = await verifyAuthenticationResponse({
      response: credentialJSON,
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
      return { success: false, error: "Verification failed" };
    }

    await updatePasskeyCounter(
      passkey.id,
      BigInt(verification.authenticationInfo.newCounter)
    );

    return { success: true };
  } catch (error) {
    logError("Passkey verification error", {}, error);
    return { success: false, error: "Failed to verify passkey" };
  }
}

export const action = withRequestContext(
  async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent");

    logInfo("Account action started", { intent: intent as string });

    const errors = {
      password: null,
      newPassword: null,
      confirmPassword: null,
      token: null,
      generic: null,
      passkey: null,
    };

    if (intent === "edit-passkey") {
      const user = await requireUser(request);
      const passkeyId = formData.get("passkeyId");
      const passkeyName = formData.get("passkeyName");

      if (typeof passkeyId !== "string" || !passkeyId) {
        return data(
          { errors: { ...errors, passkey: "Invalid passkey ID" }, done: false },
          { status: 400 }
        );
      }

      if (typeof passkeyName !== "string" || passkeyName.trim() === "") {
        return data(
          {
            errors: { ...errors, passkey: "Passkey name is required" },
            done: false,
          },
          { status: 400 }
        );
      }

      try {
        await updatePasskeyName(passkeyId, user.id, passkeyName.trim());
        logInfo("Passkey name updated successfully", { passkeyId });
        return data({ done: true, errors, intent: "edit-passkey" });
      } catch (_error) {
        return data(
          {
            errors: { ...errors, passkey: "Failed to update passkey name" },
            done: false,
          },
          { status: 500 }
        );
      }
    }

    if (intent === "delete-passkey") {
      const user = await requireUser(request);
      const passkeyId = formData.get("passkeyId");

      if (typeof passkeyId !== "string" || !passkeyId) {
        return data(
          { errors: { ...errors, passkey: "Invalid passkey ID" }, done: false },
          { status: 400 }
        );
      }

      const hasPassword = await userHasPassword(user.id);
      const passkeys = await getPasskeysByUserId(user.id);

      if (!hasPassword && passkeys.length === 1) {
        return data(
          {
            errors: {
              ...errors,
              passkey: "Cannot delete your only passkey without a password set",
            },
            done: false,
          },
          { status: 400 }
        );
      }

      try {
        await deletePasskey(passkeyId, user.id);
        logInfo("Passkey deleted successfully", { passkeyId });
        return data({ done: true, errors, intent: "delete-passkey" });
      } catch (_error) {
        return data(
          {
            errors: { ...errors, passkey: "Failed to delete passkey" },
            done: false,
          },
          { status: 500 }
        );
      }
    }

    if (intent === "remove-password") {
      const user = await requireUser(request);

      const passkeyCredentialString = formData.get("passkeyCredential");
      if (
        typeof passkeyCredentialString !== "string" ||
        !passkeyCredentialString
      ) {
        return data(
          {
            errors: { ...errors, generic: "Passkey verification required" },
            done: false,
          },
          { status: 400 }
        );
      }

      let passkeyCredential: AuthenticationResponseJSON;
      try {
        passkeyCredential = JSON.parse(passkeyCredentialString);
      } catch {
        return data(
          {
            errors: { ...errors, generic: "Invalid passkey credential" },
            done: false,
          },
          { status: 400 }
        );
      }

      const verification = await verifyPasskeyCredential(
        request,
        passkeyCredential,
        user.id
      );

      if (!verification.success) {
        return data(
          {
            errors: {
              ...errors,
              generic: verification.error || "Passkey verification failed",
            },
            done: false,
          },
          { status: 400 }
        );
      }

      try {
        await removePassword(user.id);
        await clearPasskeyChallenge(request);

        logInfo("Password removed successfully", {});
        return data({ done: true, errors, intent: "remove-password" });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "NEED_PASSKEY_BEFORE_REMOVAL"
        ) {
          return data(
            {
              errors: {
                ...errors,
                generic:
                  "You need at least one passkey before removing your password",
              },
              done: false,
            },
            { status: 400 }
          );
        }

        if (
          error instanceof Error &&
          error.message === "NO_PASSWORD_TO_REMOVE"
        ) {
          return data(
            {
              errors: {
                ...errors,
                generic: "You don't have a password set",
              },
              done: false,
            },
            { status: 400 }
          );
        }

        return data(
          {
            errors: { ...errors, generic: "Failed to remove password" },
            done: false,
          },
          { status: 500 }
        );
      }
    }

    const currentPassword = formData.get("password");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");
    const token = formData.get("token") || "";

    if (typeof newPassword !== "string" || newPassword === "") {
      return data(
        {
          errors: { ...errors, newPassword: "New password is required" },
          done: false,
        },
        { status: 400 }
      );
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      return data(
        {
          errors: { ...errors, newPassword: passwordError },
          done: false,
        },
        { status: 400 }
      );
    }

    if (typeof confirmPassword !== "string" || confirmPassword === "") {
      return data(
        {
          errors: {
            ...errors,
            confirmPassword: "Password confirmation is required",
          },
          done: false,
        },
        { status: 400 }
      );
    }

    if (confirmPassword !== newPassword) {
      return data(
        {
          errors: { ...errors, confirmPassword: "Passwords do not match" },
          done: false,
        },
        { status: 400 }
      );
    }

    let user: { email: string; id?: string } = { email: "" };
    if (!token) {
      // We do not want to go further if there is no token and the
      // user is not logged in. This check here is crucial to not allow
      // for password changes without token. We also want to verify
      // the current password before going on.
      user = await requireUser(request);

      const hasPassword = await userHasPassword(user.id!);

      if (hasPassword) {
        if (typeof currentPassword !== "string" || currentPassword === "") {
          return data(
            {
              errors: { ...errors, password: "Current password is required." },
              done: false,
            },
            { status: 400 }
          );
        }

        const isValid = await verifyLogin(user.email, currentPassword);
        if (!isValid) {
          return data(
            {
              errors: { ...errors, password: "Current password is wrong." },
              done: false,
            },
            { status: 400 }
          );
        }
      } else {
        const passkeyCredentialString = formData.get("passkeyCredential");
        if (
          typeof passkeyCredentialString !== "string" ||
          !passkeyCredentialString
        ) {
          return data(
            {
              errors: {
                ...errors,
                generic: "Passkey verification required to set password",
              },
              done: false,
            },
            { status: 400 }
          );
        }

        let passkeyCredential: AuthenticationResponseJSON;
        try {
          passkeyCredential = JSON.parse(passkeyCredentialString);
        } catch {
          return data(
            {
              errors: { ...errors, generic: "Invalid passkey credential" },
              done: false,
            },
            { status: 400 }
          );
        }

        const verification = await verifyPasskeyCredential(
          request,
          passkeyCredential,
          user.id!
        );

        if (!verification.success) {
          return data(
            {
              errors: {
                ...errors,
                generic: verification.error || "Passkey verification failed",
              },
              done: false,
            },
            { status: 400 }
          );
        }

        await clearPasskeyChallenge(request);
      }
    }

    try {
      await changePassword(user.email, newPassword, token.toString());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PASSWORD_RESET_EXPIRED"
      ) {
        return data(
          {
            errors: {
              ...errors,
              token: "Password reset link expired. Please try again.",
            },
            done: false,
          },
          { status: 400 }
        );
      }

      return data(
        {
          errors: {
            ...errors,
            generic: "Something went wrong. Please try again.",
          },
          done: false,
        },
        { status: 500 }
      );
    }

    logInfo("Password changed successfully", {});
    return data({ done: true, errors });
  }
);

export default function AccountPage() {
  const { webhookUrl, passkeys, features, hasPassword } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  return (
    <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <PasswordChangeForm
        resetToken={resetToken}
        isEnabled={features.passwordChange}
        hasPassword={hasPassword}
      />

      <PasswordRemove
        hasPassword={hasPassword}
        hasPasskeys={passkeys.length > 0}
      />

      <PasskeyRegistration isEnabled={features.passkeyRegistration} />

      <PasskeyList passkeys={passkeys} />

      <PlexWebhook isEnabled={features.plex} webhookUrl={webhookUrl} />

      <DeleteAccount isEnabled={features.deleteAccount} />
    </main>
  );
}
