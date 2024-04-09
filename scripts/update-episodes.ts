import type { Episode } from "@prisma/client";
import axios from "axios";
import striptags from "striptags";

import { TV_EPISODE_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { getEpisodesWithMissingInfo } from "../app/models/episode.server";

async function update() {
  console.log("Starting update..");

  console.log("Fetching episodes to update..");
  const episodesToUpdate = await getEpisodesWithMissingInfo();
  console.log(
    `Found ${episodesToUpdate.length} episodes to potentially update`
  );

  for (const episode of episodesToUpdate) {
    console.log("-----------------------");
    console.log(`Triggering update of ${episode.id}, mazeId ${episode.mazeId}`);

    await updateEpisode(episode);

    console.log(`Finished update of ${episode.id}`);
  }
}

async function updateEpisode(episode: Episode) {
  console.log(`Fetching mazeId ${episode.mazeId}`);
  const episodeResult = await fetch(episode.mazeId);

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

async function fetch(mazeId: string) {
  try {
    const { data } = await axios.get(`${TV_EPISODE_API_PREFIX}${mazeId}`);

    return data;
  } catch (error: any) {
    console.error("Failed to update episode", { message: error.message });

    if (error.response && error.response.status === 429) {
      console.error("Rate limited, waiting 5 seconds..");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return await fetch(mazeId);
  }
}

const { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } = process.env;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
  process.exit(1);
}

update();
