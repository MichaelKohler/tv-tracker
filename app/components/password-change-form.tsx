import { useEffect, useRef } from "react";
import { Form, useActionData } from "react-router";

import type { action } from "../routes/account";

interface PasswordChangeFormProps {
  resetToken: string;
  isEnabled: boolean;
}

export function PasswordChangeForm({
  resetToken,
  isEnabled,
}: PasswordChangeFormProps) {
  const actionData = useActionData<typeof action>();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

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
      !("intent" in actionData) &&
      currentPasswordRef.current &&
      newPasswordRef.current &&
      passwordConfirmRef.current
    ) {
      currentPasswordRef.current.value = "";
      newPasswordRef.current.value = "";
      passwordConfirmRef.current.value = "";
    }
  }, [actionData]);

  if (!isEnabled) {
    return (
      <p>
        The password change functionality is currently disabled. Please try
        again later.
      </p>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold">Change Password</h2>
      <Form method="post">
        {resetToken && <input type="hidden" name="token" value={resetToken} />}

        {!resetToken && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-mk-text"
            >
              Current Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={currentPasswordRef}
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={actionData?.errors?.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-mk-text px-2 py-1 text-lg"
              />
              {actionData?.errors?.password && (
                <p className="pt-1 text-mkerror" id="password-error">
                  {actionData.errors.password}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="my-2">
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
              name="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={actionData?.errors?.newPassword ? true : undefined}
              aria-describedby="new-password-error"
              className="w-full rounded border border-mk-text px-2 py-1 text-lg"
            />
            {actionData?.errors?.newPassword && (
              <p className="pt-1 text-mkerror" id="new-password-error">
                {actionData.errors.newPassword}
              </p>
            )}
          </div>
        </div>

        <div className="my-2">
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
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={
                actionData?.errors?.confirmPassword ? true : undefined
              }
              aria-describedby="confirm-password-error"
              className="w-full rounded border border-mk-text px-2 py-1 text-lg"
            />
            {actionData?.errors?.confirmPassword && (
              <p className="pt-1 text-mkerror" id="confirm-password-error">
                {actionData.errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        {actionData?.errors?.token && (
          <p className="pt-1 text-mkerror" id="token-error">
            {actionData.errors.token}
          </p>
        )}

        {actionData?.errors?.generic && (
          <p className="pt-1 text-mkerror" id="generic-error">
            {actionData.errors.generic}
          </p>
        )}

        {actionData?.done && !("intent" in actionData) && (
          <p>Your password has been changed.</p>
        )}

        <button
          type="submit"
          className="w-full rounded mt-4 bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
        >
          Change password
        </button>
      </Form>
    </>
  );
}
