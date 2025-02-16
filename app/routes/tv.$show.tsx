import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  isRouteErrorResponse,
  redirect,
  useActionData,
  useRouteError,
  useLoaderData,
} from "react-router";

import ErrorAlert from "../components/error-alert";
import EpisodeList from "../components/episode-list";
import ShowHeader from "../components/show-header";
import {
  markEpisodeAsWatched,
  markAllEpisodesAsWatched,
  markEpisodeAsUnwatched,
} from "../models/episode.server";
import {
  archiveShowOnUser,
  getShowById,
  removeShowFromUser,
  unarchiveShowOnUser,
} from "../models/show.server";
import { requireUserId } from "../session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  if (!params.show) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const showResult = await getShowById(params.show, userId);

  if (!showResult.show) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  return showResult;
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = (formData.get("intent") as string) || "";
  const showId = (formData.get("showId") as string) || "";
  const episodeId = (formData.get("episodeId") as string) || "";

  if (intent === "MARK_WATCHED") {
    try {
      await markEpisodeAsWatched({ userId, showId, episodeId });
    } catch (error) {
      console.error(error);

      throw data({ error: "MARKING_EPISODE_FAILED" }, { status: 500 });
    }
  }

  if (intent === "MARK_UNWATCHED") {
    try {
      await markEpisodeAsUnwatched({ userId, showId, episodeId });
    } catch (error) {
      console.error(error);

      throw data(
        { error: "MARKING_EPISODE_UNWATCHED_FAILED" },
        { status: 500 }
      );
    }
  }

  if (intent === "MARK_ALL_WATCHED") {
    try {
      await markAllEpisodesAsWatched({ userId, showId });
    } catch (error) {
      console.error(error);

      throw data({ error: "MARKING_ALL_EPISODES_FAILED" }, { status: 500 });
    }
  }

  if (intent === "DELETE_SHOW") {
    try {
      await removeShowFromUser({ userId, showId });

      return redirect("/tv");
    } catch (error) {
      console.error(error);

      throw data({ error: "REMOVE_SHOW_FAILED" }, { status: 500 });
    }
  }

  if (intent === "ARCHIVE") {
    try {
      await archiveShowOnUser({ userId, showId });

      return redirect("/tv");
    } catch (error) {
      console.error(error);

      throw data({ error: "ARCHIVE_SHOW_FAILED" }, { status: 500 });
    }
  }

  if (intent === "UNARCHIVE") {
    try {
      await unarchiveShowOnUser({ userId, showId });

      return redirect("/tv");
    } catch (error) {
      console.error(error);

      throw data({ error: "UNARCHIVE_SHOW_FAILED" }, { status: 500 });
    }
  }

  return { error: "" };
}

export default function TVShow() {
  const { show, watchedEpisodes } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const error = actionData?.error;

  if (!show) {
    return null;
  }

  return (
    <>
      <ShowHeader show={show} watchedEpisodes={watchedEpisodes} />

      {error && error === "MARKING_ALL_EPISODES_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Marking all as watched failed"
            message="There was an error while marking all episodes as watched. Please try again as required. Sorry for the inconvenience!"
          />
        </div>
      )}

      {error && error === "REMOVE_SHOW_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Removing show failed"
            message="There was an error while removing the show. Please try again. Sorry for the inconvenience!"
          />
        </div>
      )}

      {error && error === "ARCHIVE_SHOW_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Archiving show failed"
            message="There was an error while archiving the show. Please try again. Sorry for the inconvenience!"
          />
        </div>
      )}

      {error && error === "UNARCHIVE_SHOW_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Unarchiving show failed"
            message="There was an error while unarchiving the show. Please try again. Sorry for the inconvenience!"
          />
        </div>
      )}

      <h2 className="font-title text-3xl mt-8">Episodes</h2>
      <EpisodeList
        episodes={show.episodes}
        watchedEpisodes={watchedEpisodes}
        showId={show.id}
      />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <>
        <h1 className="mt-4 font-title text-3xl">Not found</h1>
        <p className="mt-4">The requested show could not be found.</p>
      </>
    );
  }

  throw error;
}
