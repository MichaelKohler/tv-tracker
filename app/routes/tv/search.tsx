import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useSearchParams,
  useTransition,
  Form,
} from "@remix-run/react";

import ShowResults from "~/components/show-results";
import { searchShows } from "~/models/show.server";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const query = search.get("query");

  const shows = await searchShows(query);

  return json(shows);
}

export default function TVSearch() {
  const shows = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const searchParam = params.get("query") || "";
  const transition = useTransition();

  return (
    <>
      <h1 className="font-title text-5xl">Search</h1>
      <Form>
        <label className="mt-10 flex w-full flex-col gap-1">
          <input
            name="query"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            data-testid="search-input"
            placeholder="Search..."
            defaultValue={searchParam}
          />
        </label>
      </Form>

      <ShowResults shows={shows} isLoading={!!transition.submission} />
    </>
  );
}
