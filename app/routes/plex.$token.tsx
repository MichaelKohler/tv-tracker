import type { ActionFunctionArgs } from "react-router";

import { evaluateBoolean, FLAGS } from "../flags.server";
import {
  getEpisodeByShowIdAndNumbers,
  markEpisodeAsWatched,
} from "../models/episode.server";
import { getShowByUserIdAndName } from "../models/show.server";
import { getUserByPlexToken } from "../models/user.server";
import { logError, logInfo } from "../logger.server";
import { withRequestContext } from "../request-handler.server";

export const action = withRequestContext(
  async ({ request, params }: ActionFunctionArgs) => {
    logInfo("Plex webhook received", { token: params.token });

    const plexEnabled = await evaluateBoolean(request, FLAGS.PLEX);
    if (!plexEnabled) {
      return {};
    }
    const body = await request.formData();
    const payload = body.get("payload");
    const parsedPayload = JSON.parse(payload as string);
    const showTitle = parsedPayload.Metadata.grandparentTitle;

    const token = params.token;
    if (!token || !showTitle || parsedPayload.event !== "media.scrobble") {
      return null;
    }

    const user = await getUserByPlexToken(token);

    if (!user) {
      return {};
    }

    const show = await getShowByUserIdAndName({
      userId: user?.id,
      name: showTitle,
    });

    if (!show) {
      return {};
    }

    const episode = await getEpisodeByShowIdAndNumbers({
      showId: show.id,
      season: parsedPayload.Metadata.parentIndex,
      episode: parsedPayload.Metadata.index,
    });

    if (!episode) {
      return {};
    }

    try {
      await markEpisodeAsWatched({
        userId: user.id,
        episodeId: episode.id,
        showId: show.id,
      });
    } catch (error) {
      logError(
        "Failed to mark episode as watched via Plex webhook",
        {
          userId: user.id,
          showId: show.id,
          showTitle,
          episodeId: episode.id,
          season: parsedPayload.Metadata.parentIndex,
          episode: parsedPayload.Metadata.index,
        },
        error
      );
    }

    return {};
  }
);
