import type { Episode } from "@prisma/client";

import { prisma } from "../app/db.server";

async function deleteEpisode(id: Episode["id"]) {
  console.log(`Deleting episode ${id} from DB..`);

  await prisma.episode.delete({
    where: {
      id,
    },
  });

  console.log("Done!");
}

const { TURSO_DATABASE_URL, EPISODE_ID } = process.env;

if (!TURSO_DATABASE_URL) {
  console.error("TURSO_DATABASE_URL not provided");
  process.exit(1);
}

if (!EPISODE_ID) {
  console.error("EPISODE_ID not provided");
  process.exit(1);
}

deleteEpisode(EPISODE_ID);
