import type { Show } from "@prisma/client";
import axios from "axios";

import { TV_GET_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { getAllRunningShowIds, prepareShow } from "../app/models/show.server";

async function update() {
  console.log("Starting update..");

  console.log("Fetching existing shows to update..");
  const showsToUpdate = await getAllRunningShowIds();
  console.log(`Found ${showsToUpdate.length} shows to update`, showsToUpdate);

  for (const id of showsToUpdate) {
    console.log("-----------------------");
    console.log(`Triggering update of ${id}`);

    await updateEpisodes(id);

    console.log(`Finished update of ${id}`);
  }
}

async function updateEpisodes(showId: Show["mazeId"]) {
  console.log(`Fetching mazeId ${showId}`);
  const showResult = await fetch(showId);

  if (!showResult) {
    throw new Error("SHOW_NOT_FOUND");
  }

  const { episodes } = prepareShow(showResult);

  const existingShow = await prisma.show.findFirst({
    where: {
      mazeId: showId,
    },
  });

  if (!existingShow) {
    console.error("SHOW_NOT_FOUND_IN_DB", { mazeId: showId });
    throw new Error("SHOW_NOT_FOUND_IN_DB");
  }

  console.log(
    `Found ${existingShow.name} in database, starting update of episodes`
  );

  const existingEpisodesIds = (
    await prisma.episode.findMany({
      where: {
        showId: existingShow.id,
      },
      select: {
        mazeId: true,
      },
    })
  ).map((episode) => episode.mazeId);

  console.log(`Found ${existingEpisodesIds.length} episodes in database`);

  const episodesToCreate = episodes.filter(
    (episode) => !existingEpisodesIds.includes(episode.mazeId)
  );

  console.log(`Adding ${episodesToCreate.length} episodes..`);

  for (const episode of episodesToCreate) {
    await prisma.episode.create({
      data: {
        ...episode,
        showId: existingShow.id,
      },
    });
  }
}

async function fetch(showId: string) {
  try {
    const { data } = await axios.get(
      `${TV_GET_API_PREFIX}${showId}?&embed=episodes`
    );

    return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to fetch show with episodes", {
      message: error.message,
    });

    if (error.response && error.response.status === 429) {
      console.error("Rate limited, waiting 5 seconds..");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return await fetch(showId);
    }

    throw error;
  }
}

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

update();
