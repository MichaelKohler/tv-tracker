import { prisma } from "../app/db.server";

async function updateMazeId(oldMazeId: string, updatedMazeId: string) {
  console.log(`Looking for episode with mazeId ${oldMazeId}...`);
  const episode = await prisma.episode.findFirst({
    where: {
      mazeId: oldMazeId,
    },
  });

  if (!episode) {
    throw new Error(`EPISODE_WITH_MAZE_ID_${oldMazeId}_NOT_FOUND`);
  }

  console.log(
    `Checking if an episode with mazeId ${updatedMazeId} already exists...`
  );
  const existingEpisode = await prisma.episode.findFirst({
    where: {
      mazeId: updatedMazeId,
    },
  });

  if (existingEpisode) {
    throw new Error(`EPISODE_WITH_MAZE_ID_${updatedMazeId}_ALREADY_EXISTS`);
  }

  console.log(`Updating episode mazeId from ${oldMazeId} to ${updatedMazeId}...`);
  await prisma.episode.update({
    data: {
      mazeId: updatedMazeId,
    },
    where: {
      id: episode.id,
    },
  });

  console.log("Done!");
}

const { DATABASE_URL, OLD_MAZE_ID, UPDATED_MAZE_ID } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not provided");
  process.exit(1);
}

if (!OLD_MAZE_ID) {
  console.error("OLD_MAZE_ID not provided");
  process.exit(1);
}

if (!UPDATED_MAZE_ID) {
  console.error("UPDATED_MAZE_ID not provided");
  process.exit(1);
}

updateMazeId(OLD_MAZE_ID, UPDATED_MAZE_ID).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
