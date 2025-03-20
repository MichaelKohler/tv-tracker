import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";

import { requireUser } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { plexToken } = await requireUser(request);
  const url = new URL(request.url);
  const webhookUrl = url.origin + "/plex/" + plexToken;

  return {
    webhookUrl,
  };
}

export default function AccountPage() {
  const { webhookUrl } = useLoaderData<typeof loader>();

  return (
    <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <Link
        to="/password/change"
        className="rounded bg-mk py-2 px-4 text-center text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
      >
        Go to change password form
      </Link>

      {webhookUrl ? (
        <>
          <hr className="my-8" />

          <p className="mb-4">
            You can add a webhook to Plex, so that every time an episode is
            watched (&gt; 90% on Plex), it will also be marked as watched here.
            This link does not use authentication, so be careful with it. Others
            could connect their Plex account to this webhook or send random data
            to it, creating a mess.
          </p>

          <p>
            <a href={webhookUrl}>{webhookUrl}</a>
          </p>
        </>
      ) : null}

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
