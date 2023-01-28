import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { getShowCount, getConnectedShowCount } from "../models/show.server";
import {
  getEpisodeCount,
  getConnectedEpisodeCount,
} from "../models/episode.server";
import { getUserCount } from "../models/user.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);

  const [
    showCount,
    connectedShowCount,
    episodeCount,
    connectedEpisodeCount,
    userCount,
  ] = await Promise.all([
    getShowCount(),
    getConnectedShowCount(),
    getEpisodeCount(),
    getConnectedEpisodeCount(),
    getUserCount(),
  ]);

  return json({
    showCount,
    connectedShowCount,
    episodeCount,
    connectedEpisodeCount,
    userCount,
  });
}
