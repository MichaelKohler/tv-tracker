import * as React from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  Form,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router";

import { changePassword, verifyLogin } from "../models/user.server";
import { requireUser } from "../session.server";
import { getPasswordValidationError } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const { plexToken } = await requireUser(request);
  const url = new URL(request.url);
  const webhookUrl = url.origin + "/plex/" + plexToken;

  return {
    webhookUrl,
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
  const { webhookUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const currentPasswordRef = React.useRef<HTMLInputElement>(null);
  const newPasswordRef = React.useRef<HTMLInputElement>(null);
  const passwordConfirmRef = React.useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  React.useEffect(() => {
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

  return (
    <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <h2 className="text-xl font-bold">Change password</h2>
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

      {webhookUrl ? (
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
    </main>
  );
}
