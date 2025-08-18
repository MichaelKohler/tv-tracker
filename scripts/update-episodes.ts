import type { Episode } from "@prisma/client";
import striptags from "striptags";

import { TV_EPISODE_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { evaluateBooleanFromScripts, FLAGS } from "../app/flags.server";
import { getEpisodesWithMissingInfo } from "../app/models/episode.server";

async function update() {
  const fetchFromSource = await evaluateBooleanFromScripts(
    FLAGS.FETCH_FROM_SOURCE
  );
  if (!fetchFromSource) {
    console.log("Feature flag for fetching from source is disabled, skipping");
    process.exit(1);
  }

  console.log("Starting update..");

  console.log("Fetching episodes to update..");
  const episodesToUpdate = await getEpisodesWithMissingInfo();
  console.log(
    `Found ${episodesToUpdate.length} episodes to potentially update`
  );

  for (const episode of episodesToUpdate) {
    console.log("-----------------------");
    console.log(
      `Triggering update of ${episode.id}, mazeId ${episode.mazeId}, ${episode.show.name} S${episode.season}E${episode.number}`
    );

    await updateEpisode(episode);

    console.log(`Finished update of ${episode.id}`);
  }
}

async function updateEpisode(episode: Episode) {
  console.log(`Fetching mazeId ${episode.mazeId}`);
  const episodeResult = await fetchEpisode(episode.mazeId);

  if (!episodeResult) {
    throw new Error("EPISODE_NOT_FOUND");
  }

  await prisma.episode.update({
    data: {
      name: episodeResult.name,
      airDate: new Date(episodeResult.airstamp),
      imageUrl: episodeResult.image?.medium,
      summary: striptags(episodeResult.summary),
    },
    where: {
      id: episode.id,
    },
  });
}

async function fetchEpisode(mazeId: string) {
  try {
    const response = await fetch(`${TV_EPISODE_API_PREFIX}${mazeId}`);

    if (response.status === 429) {
      console.error("Rate limited, waiting 5 seconds..");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return await fetchEpisode(mazeId);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch episode: ${response.statusText}`);
    }

    return await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to update episode", { message: error.message });

    process.exit(1);
  }
}

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

update().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
