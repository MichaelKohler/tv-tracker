import type { Episode, Show } from "@prisma/client";
import axios from "axios";
import striptags from "striptags";

import { TV_EPISODE_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { evaluateBooleanFromScripts, FLAGS } from "../app/flags.server";
import { type EmbeddedEpisode } from "../app/models/show.server";
import { fetchShowWithEmbededEpisodes } from "../app/models/maze.server";

async function updateEpisode(
  showName: Show["name"],
  season: Episode["season"],
  number: Episode["number"]
) {
  const fetchFromSource = await evaluateBooleanFromScripts(
    FLAGS.FETCH_FROM_SOURCE
  );
  if (!fetchFromSource) {
    console.log("Feature flag for fetching from source is disabled, skipping");
    process.exit(1);
  }

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
    console.log(`Episode not found, fetching info from TVMaze..`);
    const showWithEpisodes = await fetchShowWithEmbededEpisodes(show.mazeId);
    const fetchedEpisode = showWithEpisodes._embedded.episodes.find(
      (episode: EmbeddedEpisode) => {
        return episode.season === season && episode.number === number;
      }
    );

    console.log("Fetched episode", fetchedEpisode);

    const newRecord = {
      mazeId: `${fetchedEpisode.id}`,
      name: fetchedEpisode.name,
      season: fetchedEpisode.season,
      number: fetchedEpisode.number,
      airDate: new Date(fetchedEpisode.airstamp),
      runtime: fetchedEpisode.runtime || 0,
      imageUrl: fetchedEpisode.image?.medium,
      summary: striptags(fetchedEpisode.summary),
    };

    console.log(`Creating new episode in DB (${season}, ${number})..`);
    await prisma.episode.create({
      data: {
        ...newRecord,
        showId: show.id,
      },
    });

    return;
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

updateEpisode(TV_SHOW_NAME, season, number).catch((e) => {
  console.error(e);
  process.exit(1);
});
