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

const { DATABASE_URL, EPISODE_ID } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not provided");
  process.exit(1);
}

if (!EPISODE_ID) {
  console.error("EPISODE_ID not provided");
  process.exit(1);
}

deleteEpisode(EPISODE_ID).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
