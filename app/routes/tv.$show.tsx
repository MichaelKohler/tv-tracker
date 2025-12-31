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
import { FLAGS, evaluateBoolean } from "../flags.server";
import {
  markEpisodeAsWatched,
  markAllEpisodesAsWatched,
  markEpisodeAsUnwatched,
  markEpisodeAsIgnored,
  markEpisodeAsUnignored,
} from "../models/episode.server";
import {
  archiveShowOnUser,
  getShowById,
  removeShowFromUser,
  unarchiveShowOnUser,
} from "../models/show.server";
import { requireUserId } from "../session.server";
import { logError, logInfo } from "../logger.server";
import { withRequestContext } from "../request-handler.server";

export const loader = withRequestContext(
  async ({ request, params }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);

    if (!params.show) {
      throw new Response("Not Found", {
        status: 404,
      });
    }

    logInfo("Loading show details", {
      showId: params.show,
    });

    const showResult = await getShowById(params.show, userId);

    if (!showResult.show) {
      throw new Response("Not Found", {
        status: 404,
      });
    }

    const [markAllAsWatched, archive] = await Promise.all([
      evaluateBoolean(request, FLAGS.MARK_ALL_AS_WATCHED),
      evaluateBoolean(request, FLAGS.ARCHIVE),
    ]);

    logInfo("Show details loaded successfully", {
      showId: params.show,
      episodeCount: showResult.show.episodes.length,
    });

    return {
      ...showResult,
      features: {
        markAllAsWatched,
        archive,
      },
    };
  }
);

interface IntentHandler {
  handler: (params: {
    userId: string;
    showId: string;
    episodeId: string;
  }) => Promise<void | Response>;
  errorCode: string;
}

const intentHandlers: Record<string, IntentHandler> = {
  MARK_WATCHED: {
    handler: ({ userId, showId, episodeId }) =>
      markEpisodeAsWatched({ userId, showId, episodeId }),
    errorCode: "MARKING_EPISODE_FAILED",
  },
  MARK_UNWATCHED: {
    handler: ({ userId, showId, episodeId }) =>
      markEpisodeAsUnwatched({ userId, showId, episodeId }),
    errorCode: "MARKING_EPISODE_UNWATCHED_FAILED",
  },
  MARK_IGNORED: {
    handler: ({ userId, showId, episodeId }) =>
      markEpisodeAsIgnored({ userId, showId, episodeId }),
    errorCode: "MARKING_EPISODE_IGNORED_FAILED",
  },
  MARK_UNIGNORED: {
    handler: ({ userId, showId, episodeId }) =>
      markEpisodeAsUnignored({ userId, showId, episodeId }),
    errorCode: "MARKING_EPISODE_UNIGNORED_FAILED",
  },
  MARK_ALL_WATCHED: {
    handler: ({ userId, showId }) =>
      markAllEpisodesAsWatched({ userId, showId }),
    errorCode: "MARKING_ALL_EPISODES_FAILED",
  },
  DELETE_SHOW: {
    handler: async ({ userId, showId }) => {
      await removeShowFromUser({ userId, showId });
      return redirect("/tv");
    },
    errorCode: "REMOVE_SHOW_FAILED",
  },
  ARCHIVE: {
    handler: async ({ userId, showId }) => {
      await archiveShowOnUser({ userId, showId });
      return redirect("/tv");
    },
    errorCode: "ARCHIVE_SHOW_FAILED",
  },
  UNARCHIVE: {
    handler: async ({ userId, showId }) => {
      await unarchiveShowOnUser({ userId, showId });
      return redirect("/tv");
    },
    errorCode: "UNARCHIVE_SHOW_FAILED",
  },
};

export const action = withRequestContext(
  async ({ request }: ActionFunctionArgs) => {
    const userId = await requireUserId(request);
    const formData = await request.formData();
    const intent = (formData.get("intent") as string) || "";
    const showId = (formData.get("showId") as string) || "";
    const episodeId = (formData.get("episodeId") as string) || "";

    logInfo("Show action started", {
      intent,
      showId,
      episodeId,
    });

    const intentHandler = intentHandlers[intent];

    if (intentHandler) {
      try {
        const result = await intentHandler.handler({
          userId,
          showId,
          episodeId,
        });
        logInfo("Show action completed successfully", {
          intent,
          showId,
          episodeId,
        });
        if (result) {
          return result;
        }
      } catch (error) {
        logError(
          "Show action failed",
          {
            intent,
            showId,
            episodeId,
            errorCode: intentHandler.errorCode,
          },
          error
        );
        return data({ error: intentHandler.errorCode }, { status: 500 });
      }
    }

    return { error: "" };
  }
);

export default function TVShow() {
  const { show, watchedEpisodes, ignoredEpisodes, features } =
    useLoaderData<typeof loader>();
  const actionData = useActionData();
  const error = actionData?.error;

  if (!show) {
    return null;
  }

  return (
    <>
      <ShowHeader
        show={show}
        watchedEpisodes={watchedEpisodes}
        features={features}
      />

      {error && error === "MARKING_ALL_EPISODES_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Marking all as watched failed"
            message="There was an error while marking all episodes as watched. Please try again as required. Sorry for the inconvenience!"
          />
        </div>
      )}

      {error && error === "MARKING_EPISODE_IGNORED_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Ignoring episode failed"
            message="There was an error while ignoring the episode. Please try again. Sorry for the inconvenience!"
          />
        </div>
      )}

      {error && error === "MARKING_EPISODE_UNIGNORED_FAILED" && (
        <div className="mb-8 mt-2">
          <ErrorAlert
            title="Unignoring episode failed"
            message="There was an error while unignoring the episode. Please try again. Sorry for the inconvenience!"
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
        ignoredEpisodes={ignoredEpisodes}
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
