import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getShowsByUserId } from "~/models/show.server";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const shows = await getShowsByUserId(userId);

  return json(shows);
}

export default function TV() {
  const shows = useLoaderData<typeof loader>();

  return (
    <main className="my-12 mx-auto flex min-h-full w-full flex-col px-8">
      <div className="flex w-full flex-col">
        <h1 className="font-title text-5xl">Your shows</h1>
        {shows.length === 0 && (
          <p className="mt-9">
            You have not added any shows yet. To get started, search for a show
            in the search field above.
          </p>
        )}
      </div>
    </main>
  );
}
