import type { Episode } from "@prisma/client";
import axios from "axios";

import { TV_EPISODE_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { getEpisodesWithoutImage } from "../app/models/episode.server";

async function update() {
  console.log("Starting update..");

  console.log("Fetching episodes to update..");
  const episodesToUpdate = await getEpisodesWithoutImage();
  console.log(`Found ${episodesToUpdate.length} episodes to update`);

  for (const episode of episodesToUpdate) {
    console.log("-----------------------");
    console.log(`Triggering update of ${episode.id}, mazeId ${episode.mazeId}`);
    await updateEpisode(episode);
    console.log(`Finished update of ${episode.id}`);
    console.log("-----------------------");
    console.log("");
  }
}

async function updateEpisode(episode: Episode) {
  console.log(`Fetching mazeId ${episode.mazeId}`);
  const { data: episodeResult } = await axios.get(
    `${TV_EPISODE_API_PREFIX}${episode.mazeId}`
  );

  if (!episodeResult) {
    throw new Error("EPISODE_NOT_FOUND");
  }

  if (!episodeResult.image || !episodeResult.image.medium) {
    console.log("No image found, continuing..");
    return;
  }

  await prisma.episode.update({
    data: {
      imageUrl: episodeResult.image.medium,
    },
    where: {
      id: episode.id,
    },
  });
}

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not provided");
  process.exit(1);
}

update();
