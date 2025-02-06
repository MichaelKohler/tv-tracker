import * as React from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { data, Form, redirect, useActionData } from "react-router";
import * as Sentry from "@sentry/node";

import { triggerPasswordReset } from "../models/password.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  // Instead of using the password reset request form for logged in
  // users, use the change password form directly
  if (userId) return redirect("/password/change");
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");

  const errors = {
    email: null,
  };

  if (!validateEmail(email)) {
    throw data(
      { errors: { email: "Email is invalid" }, done: false },
      { status: 400 }
    );
  }

  triggerPasswordReset(email);

  Sentry.metrics.increment("password_reset_triggered", 1, {});

  return { done: true, errors };
}

export function meta(): ReturnType<MetaFunction> {
  return [
    {
      title: "Password Reset",
    },
  ];
}

export default function PasswordResetPage() {
  const actionData = useActionData();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const [buttonDisabled, setButtonDisabled] = React.useState(false);

  React.useEffect(() => {
    if (actionData?.errors.email) {
      emailRef.current?.focus();
    }

    if (actionData?.done) {
      setButtonDisabled(true);
    }
  }, [actionData]);

  return (
    <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
      <Form method="post" className="space-y-6">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-mk-text"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            ref={emailRef}
            id="email"
            required
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={actionData?.errors.email ? true : undefined}
            aria-describedby="email-error"
            className="w-full rounded border border-mk-text px-2 py-1 text-lg"
          />
          {actionData?.errors.email && (
            <div className="pt-1 text-mkerror" id="email-error">
              {actionData.errors.email}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
          disabled={buttonDisabled}
        >
          Send password reset email
        </button>
        <div>
          {actionData?.done && (
            <p>
              An email to reset your password has been sent to your email
              address.
            </p>
          )}
        </div>
      </Form>
    </main>
  );
}
