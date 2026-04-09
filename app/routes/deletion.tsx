import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { AuthenticationResponseJSON } from "@simplewebauthn/browser";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  data,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";

import { evaluateBoolean, FLAGS } from "../flags.server";
import {
  deleteUserByUserId,
  userHasPassword,
  verifyLogin,
} from "../models/user.server";
import {
  getPasskeysByUserId,
  verifyPasskeyAuthentication,
} from "../models/passkey.server";
import {
  requireUser,
  logout,
  getPasskeyReauthChallenge,
  clearPasskeyReauthChallenge,
} from "../session.server";
import { logError, logInfo } from "../logger.server";
import { withRequestContext } from "../request-handler.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    logInfo("Account deletion page accessed", {});

    const deleteAccountEnabled = await evaluateBoolean(
      request,
      FLAGS.DELETE_ACCOUNT
    );

    if (!deleteAccountEnabled) {
      return { deleteAccountEnabled, hasPassword: false, hasPasskeys: false };
    }

    const user = await requireUser(request);
    const [hasPassword, passkeys] = await Promise.all([
      userHasPassword(user.id),
      getPasskeysByUserId(user.id),
    ]);

    return {
      deleteAccountEnabled,
      hasPassword,
      hasPasskeys: passkeys.length > 0,
    };
  }
);

export const action = withRequestContext(
  async ({ request }: ActionFunctionArgs) => {
    const user = await requireUser(request);

    logInfo("Starting account deletion", { userId: user.id });

    const formData = await request.formData();
    const password = formData.get("password");
    const passkeyCredentialString = formData.get("passkeyCredential");

    if (passkeyCredentialString) {
      let passkeyCredential: AuthenticationResponseJSON;
      try {
        passkeyCredential = JSON.parse(passkeyCredentialString as string);
      } catch {
        return data(
          {
            errors: {
              deletion: "Invalid passkey credential.",
              password: null,
            },
          },
          { status: 400 }
        );
      }

      const challenge = await getPasskeyReauthChallenge(request);
      if (!challenge) {
        return data(
          {
            errors: {
              deletion: "No authentication challenge found. Please try again.",
              password: null,
            },
          },
          { status: 400 }
        );
      }

      const verification = await verifyPasskeyAuthentication(
        passkeyCredential,
        challenge,
        user.id
      );

      if (!verification.success) {
        return data(
          {
            errors: {
              deletion: verification.error || "Passkey authentication failed.",
              password: null,
            },
          },
          { status: 400 }
        );
      }

      await clearPasskeyReauthChallenge(request);

      try {
        await deleteUserByUserId(user.id);
        logInfo("Account deleted successfully", { userId: user.id });
      } catch (error) {
        logError("Failed to delete user account", { userId: user.id }, error);
        return data(
          {
            errors: {
              deletion: "Could not delete user. Please try again.",
              password: null,
            },
          },
          { status: 500 }
        );
      }

      return logout(request);
    }

    if (typeof password !== "string" || password === "") {
      return data(
        {
          errors: {
            deletion: null,
            password: "Password is required to confirm account deletion.",
          },
        },
        { status: 400 }
      );
    }

    const isValid = await verifyLogin(user.email, password);
    if (!isValid) {
      return data(
        {
          errors: {
            deletion: null,
            password: "Incorrect password.",
          },
        },
        { status: 400 }
      );
    }

    try {
      await deleteUserByUserId(user.id);
      logInfo("Account deleted successfully", { userId: user.id });
    } catch (error) {
      logError(
        "Failed to delete user account",
        {
          userId: user.id,
        },
        error
      );

      return data(
        {
          errors: {
            deletion: "Could not delete user. Please try again.",
            password: null,
          },
        },
        { status: 500 }
      );
    }

    return logout(request);
  }
);

export default function DeletionPage() {
  const actionData = useActionData<typeof action>();
  const { deleteAccountEnabled, hasPassword, hasPasskeys } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  if (!deleteAccountEnabled) {
    return (
      <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
        <p>
          The account deletion functionality is currently disabled. Please try
          again later.
        </p>
      </main>
    );
  }

  async function handlePasskeyDelete() {
    setIsAuthenticating(true);
    setPasskeyError(null);

    try {
      const optionsResponse = await fetch("/passkey/reauth-options");
      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }
      const options = await optionsResponse.json();
      const credential = await startAuthentication(options);

      const formData = new FormData();
      formData.append("passkeyCredential", JSON.stringify(credential));
      submit(formData, { method: "post" });
    } catch {
      setIsAuthenticating(false);
      setPasskeyError("Passkey authentication failed. Please try again.");
    }
  }

  const isSubmitting = !!navigation.formData;

  return (
    <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
      <p className="mb-4">
        Are you sure you want to delete your account? This will also delete all
        your saved data. Once deleted, this data can&apos;t be restored.
      </p>

      {actionData?.errors?.deletion && (
        <div className="mb-4 pt-1 text-mkerror" id="deletion-error">
          {actionData.errors.deletion}
        </div>
      )}

      {hasPassword && (
        <Form
          method="post"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-mk-text"
            >
              Confirm with password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              aria-invalid={actionData?.errors?.password ? true : undefined}
              aria-describedby="password-error"
              className="mt-1 w-full rounded border border-mk-text px-2 py-1 text-lg"
            />
            {actionData?.errors?.password && (
              <p className="pt-1 text-mkerror" id="password-error">
                {actionData.errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="rounded bg-mkerror px-4 py-2 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div
                className="spinner-border inline-block h-4 w-4 animate-spin rounded-full border-2"
                role="status"
              ></div>
            ) : (
              "Delete my account and all data"
            )}
          </button>
        </Form>
      )}

      {hasPasskeys && (
        <div className={hasPassword ? "mt-4" : ""}>
          {hasPassword && (
            <p className="mb-2 text-sm text-mk-text">
              Or authenticate with a passkey:
            </p>
          )}
          <button
            type="button"
            onClick={handlePasskeyDelete}
            disabled={isAuthenticating || isSubmitting}
            className="w-full rounded bg-mkerror px-4 py-2 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted disabled:opacity-50"
          >
            {isAuthenticating
              ? "Authenticating..."
              : "Delete my account with passkey"}
          </button>
          {passkeyError && <p className="pt-1 text-mkerror">{passkeyError}</p>}
        </div>
      )}
    </main>
  );
}
