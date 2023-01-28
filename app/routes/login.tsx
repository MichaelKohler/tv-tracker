import * as React from "react";
import type { ActionArgs, LoaderArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useSearchParams,
  useTransition,
} from "@remix-run/react";

import { verifyLogin } from "../models/user.server";
import { createUserSession, getUserId } from "../session.server";
import { safeRedirect, validateEmail } from "../utils";

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/tv");
  const remember = formData.get("remember");

  const errors = {
    email: null,
    password: null,
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

  const user = await verifyLogin(email, password);

  if (!user) {
    return json(
      { errors: { ...errors, email: "Invalid email or password" } },
      { status: 400 }
    );
  }

  return createUserSession({
    request,
    userId: user.id,
    remember: remember === "on" ? true : false,
    redirectTo,
  });
}

export function meta(): ReturnType<MetaFunction> {
  return {
    title: "Login",
  };
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const transition = useTransition();
  const redirectTo = searchParams.get("redirectTo") || "/tv";
  const actionData = useActionData<typeof action>();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <main className="my-12 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
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
              autoComplete="current-password"
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

        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className="w-full rounded bg-slate-600 py-2 px-4 text-white hover:bg-slate-500 focus:bg-slate-500"
          disabled={!!transition.submission}
        >
          {transition.submission ? "Logging in..." : "Log in"}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="remember"
              className="ml-2 block text-sm text-gray-900"
            >
              Remember me
            </label>
          </div>
          <div className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              className="text-blue-500 underline"
              to={{
                pathname: "/join",
                search: searchParams.toString(),
              }}
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center text-sm text-gray-500">
            Forgot your password?{" "}
            <Link
              className="text-blue-500 underline"
              to={{
                pathname: "/password/reset",
                search: searchParams.toString(),
              }}
            >
              Reset password
            </Link>
          </div>
        </div>
      </Form>
    </main>
  );
}
