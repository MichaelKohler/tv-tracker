import * as React from "react";
import type { ActionFunctionArgs, MetaFunction } from "react-router";
import { data, Form, useActionData, useSearchParams } from "react-router";

import { changePassword, verifyLogin } from "../models/user.server";
import { requireUser } from "../session.server";

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
    throw data(
      {
        errors: { ...errors, newPassword: "New password is required" },
        done: false,
      },
      { status: 400 }
    );
  }

  if (typeof confirmPassword !== "string" || confirmPassword === "") {
    throw data(
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
    throw data(
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
      throw data(
        {
          errors: { ...errors, password: "Current password is required." },
          done: false,
        },
        { status: 400 }
      );
    }

    const isValid = await verifyLogin(user.email, currentPassword);
    if (!isValid) {
      throw data(
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
      throw data(
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

    throw data(
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

export function meta(): ReturnType<MetaFunction> {
  return [
    {
      title: "Change Password",
    },
  ];
}

export default function ChangePassword() {
  const actionData = useActionData();
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
    <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
      <Form method="post" className="space-y-6">
        <input type="hidden" name="token" value={resetToken} />
        {actionData?.errors.token && (
          <div className="pt-1 text-mkerror" id="password-token-error">
            {actionData.errors.token}
          </div>
        )}
        {actionData?.errors.generic && (
          <div className="pt-1 text-mkerror" id="password-generic-error">
            {actionData.errors.generic}
          </div>
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
                <div className="pt-1 text-mkerror" id="password-error">
                  {actionData.errors.password}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
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
              <div className="pt-1 text-mkerror" id="new-password-error">
                {actionData.errors.newPassword}
              </div>
            )}
          </div>
        </div>

        <div>
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
              <div className="pt-1 text-mkerror" id="password-confirm-error">
                {actionData.errors.confirmPassword}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
        >
          Change password
        </button>

        <div>{actionData?.done && <p>Your password has been changed.</p>}</div>
      </Form>
    </main>
  );
}
