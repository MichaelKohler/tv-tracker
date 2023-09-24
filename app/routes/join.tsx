import * as React from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
  useNavigation,
} from "@remix-run/react";

import { getFlagsFromEnvironment } from "../models/config.server";
import { redeemInviteCode } from "../models/invite.server";
import { createUser, getUserByEmail } from "../models/user.server";
import { getUserId, createUserSession } from "../session.server";
import { safeRedirect, validateEmail } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (userId) {
    return redirect("/");
  }

  const environment = getFlagsFromEnvironment();
  return json({ environment });
}

export async function action({ request }: ActionFunctionArgs) {
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const invite = formData.get("invite");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/tv");

  const errors = {
    email: null,
    password: null,
    invite: null,
  };

  if (!validateEmail(email)) {
    return json(
      { errors: { ...errors, email: "Email is invalid" } },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { ...errors, password: "Password is required" } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { ...errors, password: "Password is too short" } },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return json(
      { errors: { ...errors, email: "A user already exists with this email" } },
      { status: 400 }
    );
  }

  if (SIGNUP_DISABLED) {
    if (typeof invite !== "string" || invite.length === 0) {
      return json(
        { errors: { ...errors, invite: "Invite code is required" } },
        { status: 400 }
      );
    }

    const validInvite = await redeemInviteCode(invite);
    if (!validInvite) {
      return json(
        { errors: { ...errors, invite: "Invite code is invalid" } },
        { status: 400 }
      );
    }
  }

  const user = await createUser(email, password);

  return createUserSession({
    request,
    userId: user.id,
    remember: false,
    redirectTo,
  });
}

export function meta(): ReturnType<MetaFunction> {
  return [
    {
      title: "Sign Up",
    },
  ];
}

export default function Join() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const actionData = useActionData<typeof action>();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const inviteRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors.password) {
      passwordRef.current?.focus();
    } else if (actionData?.errors.invite) {
      inviteRef.current?.focus();
    }
  }, [actionData]);

  return (
    <main className="mx-auto my-12 flex min-h-full w-full max-w-md flex-col px-8">
      {data.environment.SIGNUP_DISABLED && (
        <p className="mb-4">
          Signup is currently disabled. However, if you have an invite code, go
          ahead and paste it in below while signing up. General signup may be
          available soon.
        </p>
      )}

      <Form method="post" className="space-y-6">
        <div>
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
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={actionData?.errors.password ? true : undefined}
              aria-describedby="password-error"
              className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
            />
            {actionData?.errors.password && (
              <div className="pt-1 text-red-700" id="password-error">
                {actionData.errors.password}
              </div>
            )}
          </div>
        </div>

        {data.environment.SIGNUP_DISABLED && (
          <div>
            <label
              htmlFor="invite"
              className="block text-sm font-medium text-gray-700"
            >
              Invite code
            </label>
            <div className="mt-1">
              <input
                ref={inviteRef}
                id="invite"
                required
                name="invite"
                type="text"
                aria-invalid={actionData?.errors.invite ? true : undefined}
                aria-describedby="invite-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors.invite && (
                <div className="pt-1 text-red-700" id="invite-error">
                  {actionData.errors.invite}
                </div>
              )}
            </div>
          </div>
        )}

        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className="w-full rounded bg-slate-600 px-4 py-2 text-white hover:bg-slate-500 focus:bg-slate-500"
          disabled={!!navigation.formData}
        >
          {navigation.formData ? "Creating Account..." : "Create Account"}
        </button>
        <div className="flex items-center justify-center">
          <div className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              className="text-blue-500 underline"
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
            >
              Log in
            </Link>
          </div>
        </div>
      </Form>
    </main>
  );
}
