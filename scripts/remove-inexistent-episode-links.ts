import { prisma } from "../app/db.server";

async function check() {
  console.log("Starting check..");

  console.log("Fetching watched episodes..");
  const episodesToCheck = await prisma.episodeOnUser.findMany({
    select: {
      episodeId: true,
    },
  });
  const episodesToCheckIds = episodesToCheck.map(
    (episode) => episode.episodeId
  );
  const uniqueEpisodeToCheckIds = [...new Set(episodesToCheckIds)];
  console.log(`Found ${episodesToCheck.length} episodes to potentially update`);
  const allEpisodes = await prisma.episode.findMany({
    select: {
      id: true,
    },
  });
  const episodeIds = allEpisodes.map((episode) => episode.id);

  for (const episodeId of uniqueEpisodeToCheckIds) {
    console.log("-----------------------");
    console.log(`Triggering check of ${episodeId}`);

    if (!episodeIds.includes(episodeId)) {
      console.log(`Episode ${episodeId} does not exist`);
      await prisma.episodeOnUser.deleteMany({
        where: {
          episodeId,
        },
      });
      console.log(`Deleted watched episodes ${episodeId}`);
    }

    console.log(`Finished check of ${episodeId}`);
    console.log("-----------------------");
    console.log("");
  }
}

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not provided");
  process.exit(1);
}

check().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
