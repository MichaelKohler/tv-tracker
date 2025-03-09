import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import FullEpisodesList from "../components/full-episodes-list";
import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const episodes = await getRecentlyWatchedEpisodes(userId);

  return episodes;
}

export default function TVUpcoming() {
  const episodes = useLoaderData<typeof loader>();

  return (
    <>
      <h1 className="font-title text-5xl">Recently watched</h1>
      {episodes.length === 0 && (
        <p className="mt-9">There are no recently watched episodes.</p>
      )}
      {episodes.length > 0 && <FullEpisodesList episodes={episodes} />}
    </>
  );
}
