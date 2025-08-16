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
import { ADD_SHOW, SEARCH } from "../constants";
import { evaluate } from "../flags.server";
import { addShow, searchShows } from "../models/show.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const email = request.headers.get("x-user-email") || "";

  const features = {
    search: await evaluate(SEARCH, { email }),
    addShow: await evaluate(ADD_SHOW, { email }),
  };

  if (!features.search) {
    return { shows: [], features };
  }

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const query = search.get("query");

  const shows = await searchShows(query, userId);

  return { shows, features };
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const showId = (formData.get("showId") as string) || "";

  try {
    await addShow(userId, showId);
  } catch (error) {
    console.error(error);

    return data({ error: "ADDING_SHOW_FAILED" }, { status: 500 });
  }

  return redirect("/tv");
}

export default function TVSearch() {
  const { shows, features } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const [params] = useSearchParams();
  const searchParam = params.get("query") || "";
  const navigation = useNavigation();
  const loadingResults = navigation.formData?.get("intent") === "search";

  if (!features.search) {
    return (
      <p>This feature is currently not available. Please try again later.</p>
    );
  }

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
        features={features}
      />
    </>
  );
}
