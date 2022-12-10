import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import EpisodeList from "~/components/episode-list";
import ShowHeader from "~/components/show-header";
import { markEpisodeAsSeen } from "~/models/episode.server";
import { getShowById } from "~/models/show.server";
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
  const showId = (formData.get("showId") as string) || "";
  const episodeId = (formData.get("episodeId") as string) || "";

  try {
    await markEpisodeAsSeen({ userId, showId, episodeId });
  } catch (error) {
    console.log(error);

    return json({ error: "MARKIN_EPISODE_FAILED" }, { status: 500 });
  }

  return json({});
}

export default function TVShow() {
  const { show, seenEpisodes } = useLoaderData<typeof loader>();

  if (!show) {
    return undefined;
  }

  return (
    <>
      <ShowHeader show={show} />

      <h2 className="font-title text-3xl">Episodes</h2>
      <EpisodeList
        episodes={show.episodes}
        seenEpisodes={seenEpisodes}
        showId={show.id}
      />
    </>
  );
}
