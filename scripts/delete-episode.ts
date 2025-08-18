import type { Episode, Show } from "@prisma/client";

import { prisma } from "../app/db.server";

async function deleteEpisode(
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

  console.log("Deleting episode in DB...");
  await prisma.episode.delete({
    where: {
      id: episode.id,
    },
  });

  console.log("Done!");
}

const { DATABASE_URL, TV_SHOW_NAME, TV_EPISODE_SEASON, TV_EPISODE_NUMBER } =
  process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not provided");
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

deleteEpisode(TV_SHOW_NAME, season, number).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
