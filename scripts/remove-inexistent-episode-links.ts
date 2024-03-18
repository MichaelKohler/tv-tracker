import { prisma } from "../app/db.server";

async function check() {
  console.log("Starting check..");

  console.log("Fetching watched episodes..");
  const episodesToCheck = await prisma.episodeOnUser.findMany();
  const episodesToCheckIds = episodesToCheck.map(
    (episode) => episode.episodeId
  );
  const uniqueEpisodeToCheckIds = [...new Set(episodesToCheckIds)];
  console.log(`Found ${episodesToCheck.length} episodes to potentially update`);
  const allEpisodes = await prisma.episode.findMany();
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

const { TURSO_DATABASE_URL } = process.env;

if (!TURSO_DATABASE_URL) {
  console.error("TURSO_DATABASE_URL not provided");
  process.exit(1);
}

check();
