import { redirect } from "@remix-run/node";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import EpisodeList from "~/components/episode-list";
import ShowHeader from "~/components/show-header";
import {
  markEpisodeAsWatched,
  markAllEpisodesAsWatched,
  markEpisodeAsUnwatched,
} from "~/models/episode.server";
import { getShowById, removeShowFromUser } from "~/models/show.server";
import { requireUserId } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
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

  return json(showResult);
}

export async function action({ request }: ActionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = (formData.get("intent") as string) || "";
  const showId = (formData.get("showId") as string) || "";
  const episodeId = (formData.get("episodeId") as string) || "";

  if (intent === "MARK_WATCHED") {
    try {
      await markEpisodeAsWatched({ userId, showId, episodeId });
    } catch (error) {
      console.log(error);

      return json({ error: "MARKING_EPISODE_FAILED" }, { status: 500 });
    }
  }

  if (intent === "MARK_UNWATCHED") {
    try {
      await markEpisodeAsUnwatched({ userId, showId, episodeId });
    } catch (error) {
      console.log(error);

      return json(
        { error: "MARKING_EPISODE_UNWATCHED_FAILED" },
        { status: 500 }
      );
    }
  }

  if (intent === "MARK_ALL_WATCHED") {
    try {
      await markAllEpisodesAsWatched({ userId, showId });
    } catch (error) {
      console.log(error);

      return json({ error: "MARKING_ALL_EPISODES_FAILED" }, { status: 500 });
    }
  }

  if (intent === "DELETE_SHOW") {
    try {
      await removeShowFromUser({ userId, showId });
      return redirect("/tv");
    } catch (error) {
      console.log(error);

      return json({ error: "REMOVE_SHOW_FAILED" }, { status: 500 });
    }
  }

  return json({});
}

export default function TVShow() {
  const { show, watchedEpisodes } = useLoaderData<typeof loader>();

  if (!show) {
    return undefined;
  }

  return (
    <>
      <ShowHeader show={show} />

      <h2 className="font-title text-3xl">Episodes</h2>
      <EpisodeList
        episodes={show.episodes}
        watchedEpisodes={watchedEpisodes}
        showId={show.id}
      />
    </>
  );
}
