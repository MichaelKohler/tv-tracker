import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, Link, useSearchParams } from "react-router";

import { getUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return new Response(null, { status: 302, headers: { Location: "/" } });
  return {};
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Sign Up",
    },
  ];
};

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;

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
              id="email"
              required
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded border border-mk-text px-2 py-1 text-lg"
            />
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
              name="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded border border-mk-text px-2 py-1 text-lg"
            />
          </div>
        </div>

        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
        >
          Create Account
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
