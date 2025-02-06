import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
  useNavigation,
  Form,
} from "react-router";
import * as Sentry from "@sentry/node";

import ShowResults from "../components/show-results";
import { addShow, searchShows } from "../models/show.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  Sentry.metrics.increment("search", 1, {});

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const query = search.get("query");

  const shows = await searchShows(query, userId);
  Sentry.metrics.distribution("search_returned_shows", shows.length, {});

  return shows;
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const showId = (formData.get("showId") as string) || "";

  try {
    await addShow(userId, showId);

    Sentry.metrics.increment("show_added", 1, {});
  } catch (error) {
    console.error(error);
    Sentry.metrics.increment("show_add_failed", 1, {});

    throw data({ error: "ADDING_SHOW_FAILED" }, { status: 500 });
  }

  return redirect("/tv");
}

export default function TVSearch() {
  const shows = useLoaderData<typeof loader>();
  const actionData = useActionData();
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
            className="flex-1 rounded-md border-2 border-mk px-3 text-lg leading-loose"
            data-testid="search-input"
            placeholder="Search..."
            defaultValue={searchParam}
            aria-label="Search"
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
