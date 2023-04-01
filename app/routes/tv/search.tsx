import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useSearchParams,
  useNavigation,
  Form,
} from "@remix-run/react";

import ShowResults from "../../components/show-results";
import { addShow, searchShows } from "../../models/show.server";
import { requireUserId } from "../../session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const query = search.get("query");

  const shows = await searchShows(query, userId);

  return json(shows);
}

export async function action({ request }: ActionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const showId = (formData.get("showId") as string) || "";

  try {
    await addShow(userId, showId);
  } catch (error) {
    console.error(error);

    return json({ error: "ADDING_SHOW_FAILED" }, { status: 500 });
  }

  return redirect("/tv");
}

export default function TVSearch({ error }: { error: string }) {
  const shows = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [params] = useSearchParams();
  const searchParam = params.get("query") || "";
  const navigation = useNavigation();
  const loadingResults = navigation.formData?.get("intent") === "search";

  return (
    <>
      <h1 className="font-title text-5xl">Search</h1>
      <Form>
        <input type="hidden" name="intent" value="search" />
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

      <ShowResults
        shows={shows}
        isLoading={loadingResults}
        error={actionData?.error}
      />
    </>
  );
}
