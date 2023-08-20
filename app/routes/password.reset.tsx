import * as React from "react";
import type { ActionArgs, LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

import { triggerPasswordReset } from "../models/password.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  // Instead of using the password reset request form for logged in
  // users, use the change password form directly
  if (userId) return redirect("/password/change");
  return json({});
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");

  const errors = {
    email: null,
  };

  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid" }, done: false },
      { status: 400 }
    );
  }

  triggerPasswordReset(email);

  return json({ done: true, errors }, { status: 200 });
}

export function meta(): ReturnType<V2_MetaFunction> {
  return [
    {
      title: "Password Reset",
    },
  ];
}

export default function PasswordResetPage() {
  const actionData = useActionData<typeof action>();
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
    <main className="mx-auto my-12 flex min-h-full w-full max-w-md flex-col px-8">
      <Form method="post" className="space-y-6">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            ref={emailRef}
            id="email"
            required
            autoFocus={true}
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={actionData?.errors.email ? true : undefined}
            aria-describedby="email-error"
            className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
          />
          {actionData?.errors.email && (
            <div className="pt-1 text-red-700" id="email-error">
              {actionData.errors.email}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="w-full rounded bg-slate-600 px-4 py-2 text-white hover:bg-slate-500 focus:bg-slate-500"
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
