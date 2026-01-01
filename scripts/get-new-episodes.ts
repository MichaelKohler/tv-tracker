import type { Show } from "@prisma/client";

import { TV_GET_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { evaluateBooleanFromScripts, FLAGS } from "../app/flags.server";
import { getAllRunningShowIds, prepareShow } from "../app/models/show.server";

async function update() {
  const fetchFromSource = await evaluateBooleanFromScripts(
    FLAGS.FETCH_FROM_SOURCE
  );
  if (!fetchFromSource) {
    console.log("Feature flag for fetching from source is disabled, skipping");
    process.exit(1);
  }

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
  const showResult = await fetchShowWithEpisodes(showId);

  if (!showResult) {
    throw new Error("SHOW_NOT_FOUND");
  }

  const { episodes } = prepareShow(showResult);

  const existingShow = await prisma.show.findFirst({
    where: {
      mazeId: showId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existingShow) {
    console.error("SHOW_NOT_FOUND_IN_DB", { mazeId: showId });
    throw new Error("SHOW_NOT_FOUND_IN_DB");
  }

  console.log(
    `Found ${existingShow.name} in database, starting update of episodes`
  );

  const existingEpisodes = await prisma.episode.findMany({
    where: {
      showId: existingShow.id,
    },
    select: {
      mazeId: true,
    },
  });
  const existingEpisodesIds = existingEpisodes.map(
    (episode: (typeof existingEpisodes)[number]) => episode.mazeId
  );

  console.log(`Found ${existingEpisodesIds.length} episodes in database`);

  const episodesToCreate =
    episodes?.filter(
      (episode) => !existingEpisodesIds.includes(episode.mazeId)
    ) || [];

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

async function fetchShowWithEpisodes(showId: string) {
  try {
    const response = await fetch(
      `${TV_GET_API_PREFIX}${showId}?&embed=episodes`
    );

    if (response.status === 429) {
      console.error("Rate limited, waiting 5 seconds..");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return await fetchShowWithEpisodes(showId);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch show with episodes: ${response.statusText}`
      );
    }

    return await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to fetch show with episodes", {
      message: error.message,
    });

    process.exit(1);
  }
}

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

update().catch((e) => {
  console.error(e);
  process.exit(1);
});
