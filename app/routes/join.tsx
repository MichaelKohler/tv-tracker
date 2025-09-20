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
  useLoaderData,
  useSearchParams,
  useNavigation,
} from "react-router";

import { evaluateBoolean, FLAGS } from "../flags.server";
import { redeemInviteCode } from "../models/invite.server";
import { createUser, getUserByEmail } from "../models/user.server";
import { getUserId, createUserSession } from "../session.server";
import {
  safeRedirect,
  validateAndSanitizeEmail,
  getPasswordValidationError,
} from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (userId) {
    return redirect("/");
  }

  const signupDisabled = await evaluateBoolean(request, FLAGS.SIGNUP_DISABLED);

  return {
    features: {
      signup: !signupDisabled,
    },
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const emailInput = formData.get("email");
  const passwordInput = formData.get("password");
  const invite = formData.get("invite");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/tv");

  const signupDisabled = await evaluateBoolean(request, FLAGS.SIGNUP_DISABLED);

  const errors = {
    email: null,
    password: null,
    invite: null,
  };

  const email = validateAndSanitizeEmail(emailInput);
  if (!email) {
    return data(
      { errors: { ...errors, email: "Email is invalid" } },
      { status: 400 }
    );
  }

  if (typeof passwordInput !== "string") {
    return data(
      { errors: { ...errors, password: "Password is required" } },
      { status: 400 }
    );
  }

  const passwordError = getPasswordValidationError(passwordInput);
  if (passwordError) {
    return data(
      { errors: { ...errors, password: passwordError } },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return data(
      { errors: { ...errors, email: "A user already exists with this email" } },
      { status: 400 }
    );
  }

  if (signupDisabled) {
    if (typeof invite !== "string" || invite.length === 0) {
      return data(
        { errors: { ...errors, invite: "Invite code is required" } },
        { status: 400 }
      );
    }

    const validInvite = await redeemInviteCode(invite);
    if (!validInvite) {
      return data(
        { errors: { ...errors, invite: "Invite code is invalid" } },
        { status: 400 }
      );
    }
  }

  const user = await createUser(email, passwordInput);

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
  const actionData = useActionData();
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
    <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
      {!data.features.signup && (
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
              autoComplete="new-password"
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

        {!data.features.signup && (
          <div>
            <label
              htmlFor="invite"
              className="block text-sm font-medium text-mk-text"
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
                className="w-full rounded border border-mk-text px-2 py-1 text-lg"
              />
              {actionData?.errors.invite && (
                <div className="pt-1 text-mkerror" id="invite-error">
                  {actionData.errors.invite}
                </div>
              )}
            </div>
          </div>
        )}

        <input type="hidden" name="redirectTo" value={redirectTo} />
        <p className="text-sm font-medium text-mk-text">
          Creating an account means that you are accepting that data is
          forwarded to <a href="https://sentry.io">Sentry</a> which includes
          information about errors you encounter and profiling information such
          as timing information. This also includes information about your
          browser. There is no way to opt out of this. Don&apos;t use this
          website if you disagree with this.
        </p>
        <button
          type="submit"
          className="w-full rounded bg-mk px-4 py-2 text-white hover:mk-tertiary focus:mk-tertiary"
          disabled={!!navigation.formData}
        >
          {navigation.formData ? "Creating Account..." : "Create Account"}
        </button>
        <div className="flex items-center justify-center">
          <div className="text-center text-sm text-mk-text">
            Already have an account?{" "}
            <Link
              className="text-mk-text underline"
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
