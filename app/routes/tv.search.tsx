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

import ShowResults from "../components/show-results";
import { evaluateBoolean, FLAGS } from "../flags.server";
import { addShow, searchShows } from "../models/show.server";
import { requireUserId } from "../session.server";
import { logError, logInfo } from "../logger.server";
import { withRequestContext } from "../request-handler.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);

    logInfo("TV search loader accessed", {});

    const features = {
      search: await evaluateBoolean(request, FLAGS.SEARCH),
      addShow: await evaluateBoolean(request, FLAGS.ADD_SHOW),
    };

    if (!features.search) {
      return { shows: [], features };
    }

    const url = new URL(request.url);
    const search = new URLSearchParams(url.search);
    const query = search.get("query");

    const shows = await searchShows(query, userId);

    logInfo("TV search completed", {
      query,
      resultsCount: shows.length,
    });

    return { shows, features };
  }
);

export const action = withRequestContext(
  async ({ request }: ActionFunctionArgs) => {
    const addShowEnabled = await evaluateBoolean(request, FLAGS.ADD_SHOW);
    if (!addShowEnabled) {
      return data({ error: "ADDING_SHOW_DISABLED" }, { status: 403 });
    }

    const userId = await requireUserId(request);
    const formData = await request.formData();
    const showId = (formData.get("showId") as string) || "";

    logInfo("Adding show to watchlist", { showId });

    try {
      await addShow(userId, showId);
      logInfo("Show added to watchlist successfully", {
        showId,
      });
    } catch (error) {
      logError(
        "Failed to add show to user's watchlist",
        {
          showId,
        },
        error
      );

      return data({ error: "ADDING_SHOW_FAILED" }, { status: 500 });
    }

    return redirect("/tv");
  }
);

export default function TVSearch() {
  const { shows, features } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const [params] = useSearchParams();
  const searchParam = params.get("query") || "";
  const navigation = useNavigation();
  const loadingResults = navigation.formData?.get("intent") === "search";

  return (
    <>
      <h1 className="font-title text-5xl">Search</h1>
      {!features.search && (
        <p className="mt-4">This feature is currently disabled.</p>
      )}
      {features.search && (
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
      )}

      {features.search && (
        <ShowResults
          shows={shows}
          isLoading={loadingResults}
          error={actionData?.error}
          features={features}
        />
      )}
    </>
  );
}
