import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  Form,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { startRegistration } from "@simplewebauthn/browser";

import { evaluateBoolean, FLAGS } from "../flags.server";
import { changePassword, verifyLogin } from "../models/user.server";
import { requireUser } from "../session.server";
import { getPasswordValidationError } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    // We need to short-curcuit everything and allow the change of password
    return {
      webhookUrl: null,
      features: {
        passwordChange: await evaluateBoolean(request, FLAGS.PASSWORD_CHANGE),
        passkeyRegistration: false,
        deleteAccount: false,
        plex: false,
      },
    };
  }

  const { plexToken } = await requireUser(request);
  const webhookUrl = url.origin + "/plex/" + plexToken;

  const features = {
    passwordChange: await evaluateBoolean(request, FLAGS.PASSWORD_CHANGE),
    passkeyRegistration: await evaluateBoolean(
      request,
      FLAGS.PASSKEY_REGISTRATION
    ),
    deleteAccount: await evaluateBoolean(request, FLAGS.DELETE_ACCOUNT),
    plex: await evaluateBoolean(request, FLAGS.PLEX),
  };

  return {
    webhookUrl,
    features,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const currentPassword = formData.get("password");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");
  const token = formData.get("token") || "";

  const errors = {
    password: null,
    newPassword: null,
    confirmPassword: null,
    token: null,
    generic: null,
  };

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

  let user = { email: "" };
  if (!token) {
    // We do not want to go further if there is no token and the
    // user is not logged in. This check here is crucial to not allow
    // for password changes without token. We also want to verify
    // the current password before going on.
    user = await requireUser(request);

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
  }

  try {
    await changePassword(user.email, newPassword, token.toString());
  } catch (error) {
    console.error("CHANGE_PASSWORD_ERROR", error);

    if (error instanceof Error && error.message === "PASSWORD_RESET_EXPIRED") {
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

  return { done: true, errors };
}

export default function AccountPage() {
  const { webhookUrl, features } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  const [showPasskeyForm, setShowPasskeyForm] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  const passkeyNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors.password) {
      currentPasswordRef.current?.focus();
    } else if (actionData?.errors.newPassword) {
      newPasswordRef.current?.focus();
    } else if (actionData?.errors.confirmPassword) {
      passwordConfirmRef.current?.focus();
    }

    if (
      actionData?.done &&
      currentPasswordRef.current &&
      newPasswordRef.current &&
      passwordConfirmRef.current
    ) {
      currentPasswordRef.current.value = "";
      newPasswordRef.current.value = "";
      passwordConfirmRef.current.value = "";
    }
  }, [actionData]);

  async function handleRegisterPasskey(e: FormEvent) {
    e.preventDefault();

    if (!passkeyName.trim()) {
      setPasskeyError("Please enter a name for your passkey");
      passkeyNameRef.current?.focus();
      return;
    }

    setIsRegistering(true);
    setPasskeyError(null);

    try {
      const optionsResponse = await fetch("/passkey/register-options");

      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();

      const credential = await startRegistration(options);

      const verifyResponse = await fetch("/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, name: passkeyName.trim() }),
      });

      const result = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(result.error || "Registration failed");
      }

      setPasskeySuccess(true);
      setPasskeyName("");
      setShowPasskeyForm(false);
    } catch (error) {
      const errorMessages: Record<string, string> = {
        NotAllowedError: "Registration canceled or timed out",
        InvalidStateError: "This passkey is already registered",
        NotSupportedError: "Your browser doesn't support passkeys",
        AbortError: "Registration was canceled",
      };

      setPasskeyError(
        error instanceof Error && error.name in errorMessages
          ? errorMessages[error.name]
          : error instanceof Error
            ? error.message
            : "Failed to register passkey. Please try again."
      );
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <h2 className="text-xl font-bold">Change password</h2>
      {features.passwordChange ? (
        <Form method="post" className="my-4">
          <input type="hidden" name="token" value={resetToken} />
          {actionData?.errors.token && (
            <p className="text-mkerror" id="password-token-error">
              {actionData.errors.token}
            </p>
          )}
          {actionData?.errors.generic && (
            <p className="text-mkerror" id="password-generic-error">
              {actionData.errors.generic}
            </p>
          )}

          {!resetToken && (
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-mk-text"
              >
                Current Password
              </label>
              <div className="mt-1">
                <input
                  id="currentPassword"
                  ref={currentPasswordRef}
                  required
                  name="password"
                  type="password"
                  aria-invalid={actionData?.errors.password ? true : undefined}
                  aria-describedby="password-error"
                  className="w-full rounded border border-mk-text px-2 py-1 text-lg"
                />
                {actionData?.errors.password && (
                  <p className="pt-1 text-mkerror" id="password-error">
                    {actionData.errors.password}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-mk-text"
            >
              New Password
            </label>
            <div className="mt-1">
              <input
                id="newPassword"
                ref={newPasswordRef}
                required
                name="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={actionData?.errors.newPassword ? true : undefined}
                aria-describedby="new-password-error"
                className="w-full rounded border border-mk-text px-2 py-1 text-lg"
              />
              {actionData?.errors.newPassword && (
                <p className="pt-1 text-mkerror" id="new-password-error">
                  {actionData.errors.newPassword}
                </p>
              )}
            </div>
          </div>

          <div className="my-4">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-mk-text"
            >
              Confirm Password
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                ref={passwordConfirmRef}
                required
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={
                  actionData?.errors.confirmPassword ? true : undefined
                }
                aria-describedby="password-confirm-error"
                className="w-full rounded border border-mk-text px-2 py-1 text-lg"
              />
              {actionData?.errors.confirmPassword && (
                <p className="pt-1 text-mkerror" id="password-confirm-error">
                  {actionData.errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
          >
            Change password
          </button>

          {actionData?.done && <p>Your password has been changed.</p>}
        </Form>
      ) : (
        <p className="my-4">
          The password change functionality is currently disabled. Please try
          again later.
        </p>
      )}

      {features.passkeyRegistration ? (
        <>
          <hr className="my-8" />

          <h2 className="text-xl font-bold">Security Keys & Passkeys</h2>
          <p className="my-4">
            Add a passkey or security key for faster, more secure login.
            Passkeys use your device&apos;s biometrics or PIN.
          </p>

          {!showPasskeyForm ? (
            <button
              type="button"
              onClick={() => {
                setShowPasskeyForm(true);
                setPasskeyError(null);
                setPasskeySuccess(false);
              }}
              className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
            >
              Add Passkey
            </button>
          ) : (
            <form onSubmit={handleRegisterPasskey} className="my-4">
              <div>
                <label
                  htmlFor="passkeyName"
                  className="block text-sm font-medium text-mk-text"
                >
                  Passkey Name
                </label>
                <div className="mt-1">
                  <input
                    id="passkeyName"
                    ref={passkeyNameRef}
                    type="text"
                    value={passkeyName}
                    onChange={(e) => setPasskeyName(e.target.value)}
                    placeholder="e.g., My iPhone, YubiKey 5"
                    disabled={isRegistering}
                    aria-invalid={passkeyError ? true : undefined}
                    aria-describedby="passkey-name-error"
                    className="w-full rounded border border-mk-text px-2 py-1 text-lg"
                  />
                  {passkeyError && (
                    <p className="pt-1 text-mkerror" id="passkey-name-error">
                      {passkeyError}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary disabled:opacity-50"
                >
                  {isRegistering ? "Registering..." : "Register Passkey"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasskeyForm(false);
                    setPasskeyName("");
                    setPasskeyError(null);
                  }}
                  disabled={isRegistering}
                  className="rounded border border-mk-text px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {passkeySuccess && (
            <p className="mt-2 text-green-600">
              Passkey registered successfully!
            </p>
          )}
        </>
      ) : null}

      {features.plex && webhookUrl ? (
        <>
          <hr className="my-8" />

          <h2 className="text-xl font-bold">Plex Webhook</h2>
          <p className="my-4">
            You can add a webhook to Plex, so that every time an episode is
            watched (&gt; 90% on Plex), it will also be marked as watched here.
            This link does not use authentication, so be careful with it. Others
            could connect their Plex account to this webhook or send random data
            to it, creating a mess.
          </p>

          <p>
            <a href={webhookUrl}>{webhookUrl}</a>
          </p>
        </>
      ) : null}

      <hr className="my-8" />

      <h2 className="text-xl font-bold">Delete account</h2>
      {features.deleteAccount ? (
        <>
          <p className="my-4">
            Deleting your account will also delete all your saved data. Once
            deleted, this data can&apos;t be restored.
          </p>
          <Link
            to="/deletion"
            className="rounded bg-mkerror py-2 px-4 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
          >
            Delete my account and all data
          </Link>
        </>
      ) : (
        <p className="my-4">
          The account deletion functionality is currently disabled. Please try
          again later.
        </p>
      )}
    </main>
  );
}
