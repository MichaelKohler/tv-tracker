import type { LoaderArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  return null;
}

export default function AccountPage() {
  return (
    <main className="my-12 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <Link
        to="/password/change"
        className="rounded bg-slate-600 py-2 px-4 text-center text-white hover:bg-slate-500 active:bg-slate-500"
      >
        Go to change password form
      </Link>

      <hr className="my-8" />

      <p className="mb-4">
        Deleting your account will also delete all your saved data. Once
        deleted, this data can't be restored.
      </p>
      <Link
        to="/deletion"
        className="rounded bg-red-700 py-2 px-4 text-center text-white hover:bg-red-500 active:bg-red-500"
      >
        Delete my account and all data
      </Link>
    </main>
  );
}
