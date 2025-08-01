import * as React from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useSearchParams,
  useNavigation,
} from "react-router";

import { verifyLogin } from "../models/user.server";
import { createUserSession, getUserId } from "../session.server";
import { safeRedirect, validateAndSanitizeEmail } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const emailInput = formData.get("email");
  const passwordInput = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/tv");
  const remember = formData.get("remember");

  const errors = {
    email: null,
    password: null,
  };

  const email = validateAndSanitizeEmail(emailInput);
  if (!email) {
    return data(
      { errors: { ...errors, email: "Email is invalid" } },
      { status: 400 }
    );
  }

  if (typeof passwordInput !== "string" || passwordInput.length === 0) {
    return data(
      { errors: { ...errors, password: "Password is required" } },
      { status: 400 }
    );
  }

  const user = await verifyLogin(email, passwordInput);

  if (!user) {
    return data(
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
  return [
    {
      title: "Login",
    },
  ];
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const redirectTo = searchParams.get("redirectTo") || "/tv";
  const actionData = useActionData();
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
    <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
      <Form method="post" className="space-y-6">
        <div>
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
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-mk-text"
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
              className="w-full rounded border border-mk-text px-2 py-1 text-lg"
            />
            {actionData?.errors.password && (
              <div className="pt-1 text-mkerror" id="password-error">
                {actionData.errors.password}
              </div>
            )}
          </div>
        </div>

        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
          disabled={!!navigation.formData}
        >
          {navigation.formData ? "Logging in..." : "Log in"}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-mk-text text-mk-text focus:ring-mk-text"
            />
            <label
              htmlFor="remember"
              className="ml-2 block text-sm text-mk-text"
            >
              Remember me
            </label>
          </div>
          <div className="text-center text-sm text-mk-text">
            Don&apos;t have an account?{" "}
            <Link
              className="text-mk-text underline"
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
          <div className="text-center text-sm text-mk-text">
            Forgot your password?{" "}
            <Link
              className="text-mk-text underline"
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
