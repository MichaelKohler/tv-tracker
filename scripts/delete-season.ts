import type { Episode, Show } from "@prisma/client";

import { prisma } from "../app/db.server";

async function deleteSeason(showName: Show["name"], season: Episode["season"]) {
  console.log(`Fetching show ${showName} from DB..`);
  const show = await prisma.show.findFirst({
    where: {
      name: showName,
    },
  });

  if (!show) {
    throw new Error("EXISTING_SHOW_NOT_FOUND");
  }

  console.log(`Deleting season ${season} for show ${showName} in DB...`);
  const { count } = await prisma.episode.deleteMany({
    where: {
      showId: show.id,
      season,
    },
  });

  console.log(`Deleted ${count} episodes.`);
  console.log("Done!");
}

const { DATABASE_URL, TV_SHOW_NAME, TV_EPISODE_SEASON } = process.env;

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

const season = parseInt(TV_EPISODE_SEASON, 10);

if (isNaN(season) || season < 1) {
  console.error("TV_EPISODE_SEASON must be a valid positive integer");
  process.exit(1);
}
deleteSeason(TV_SHOW_NAME, season).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
