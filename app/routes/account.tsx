import type { LoaderFunctionArgs } from "react-router";
import { Link } from "react-router";

import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  return null;
}

export default function AccountPage() {
  return (
    <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <Link
        to="/password/change"
        className="rounded bg-mk py-2 px-4 text-center text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
      >
        Go to change password form
      </Link>

      <hr className="my-8" />

      <p className="mb-4">
        Deleting your account will also delete all your saved data. Once
        deleted, this data can&apos;t be restored.
      </p>
      <Link
        to="/deletion"
        className="rounded bg-mkerror py-2 px-4 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
      >
        Delete my account and all data
      </Link>
    </main>
  );
}
