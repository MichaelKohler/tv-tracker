import type { Episode, Show } from "@prisma/client";
import axios from "axios";
import striptags from "striptags";

import { TV_EPISODE_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";

async function updateEpisode(
  showName: Show["name"],
  season: Episode["season"],
  number: Episode["number"]
) {
  console.log(`Fetching show ${showName} from DB..`);
  const show = await prisma.show.findFirst({
    where: {
      name: showName,
    },
  });

  if (!show) {
    throw new Error("EXISTING_SHOW_NOT_FOUND");
  }

  console.log(`Fetching episode (${season}, ${number}) from DB..`);
  const episode = await prisma.episode.findFirst({
    where: {
      showId: show.id,
      season,
      number,
    },
  });

  if (!episode) {
    throw new Error("EXISTING_EPISODE_NOT_FOUND");
  }

  console.log(`Fetching latest episode info from maze ${episode.mazeId}`);
  const { data: episodeResult } = await axios.get(
    `${TV_EPISODE_API_PREFIX}${episode.mazeId}`
  );

  if (!episodeResult) {
    throw new Error("EPISODE_NOT_FOUND");
  }

  console.log("Updating episode in DB...");
  await prisma.episode.update({
    data: {
      name: episodeResult.name,
      airDate: new Date(episodeResult.airstamp),
      runtime: episodeResult.runtime || 0,
      imageUrl: episodeResult.image?.medium,
      summary: striptags(episode.summary),
    },
    where: {
      id: episode.id,
    },
  });

  console.log("Done!");
}

const {
  TURSO_DATABASE_URL,
  TV_SHOW_NAME,
  TV_EPISODE_SEASON,
  TV_EPISODE_NUMBER,
} = process.env;

if (!TURSO_DATABASE_URL) {
  console.error("TURSO_DATABASE_URL not provided");
  process.exit(1);
}

if (!TV_SHOW_NAME) {
  console.error("TV_SHOW_NAME not provided");
  process.exit(1);
}

if (!TV_EPISODE_SEASON) {
  console.error("TV_EPISODE_SEASON not provided");
  process.exit(1);
}

if (!TV_EPISODE_NUMBER) {
  console.error("TV_EPISODE_NUMBER not provided");
  process.exit(1);
}

const season = parseInt(TV_EPISODE_SEASON, 10);
const number = parseInt(TV_EPISODE_NUMBER, 10);

updateEpisode(TV_SHOW_NAME, season, number);
