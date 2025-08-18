import type { Show } from "@prisma/client";
import axios from "axios";

import { TV_GET_API_PREFIX } from "../app/constants";
import { prisma } from "../app/db.server";
import { evaluateBooleanFromScripts, FLAGS } from "../app/flags.server";
import type { TVMazeShowResponse } from "../app/types/tvmaze";

async function updateShowStatuses() {
  console.log("Starting show status update process...");

  // Check feature flag
  const fetchFromSource = await evaluateBooleanFromScripts(
    FLAGS.FETCH_FROM_SOURCE
  );
  if (!fetchFromSource) {
    console.log("Feature flag for fetching from source is disabled, skipping");
    process.exit(1);
  }

  // Get all shows with null end status
  const showsToCheck = await prisma.show.findMany({
    where: {
      ended: null,
    },
    select: {
      id: true,
      name: true,
      mazeId: true,
      ended: true,
    },
  });

  console.log(
    `Processing ${showsToCheck.length} shows with unknown end status`
  );

  let updatedCount = 0;
  const failedShows: { name: string; mazeId: string; error: string }[] = [];

  // Process shows one at a time (serial processing)
  for (const show of showsToCheck) {
    console.log(`Checking show: ${show.name} (mazeId: ${show.mazeId})`);

    try {
      const updated = await checkAndUpdateShow(show);
      if (updated) {
        updatedCount++;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error processing show ${show.name}:`, error);
      failedShows.push({
        name: show.name,
        mazeId: show.mazeId,
        error: errorMessage,
      });
      // Continue processing other shows instead of exiting
    }
  }

  console.log(
    `Process completed. Processed ${showsToCheck.length} shows, updated ${updatedCount} shows`
  );

  // Report failures at the end
  if (failedShows.length > 0) {
    console.error("\n🚨 FAILURES SUMMARY:");
    console.error(`${failedShows.length} show(s) failed to process:`);
    for (const failed of failedShows) {
      console.error(
        `  - ${failed.name} (mazeId: ${failed.mazeId}): ${failed.error}`
      );
    }
    console.error("\nThe job is marked as FAILED due to the above errors.");
    process.exit(1);
  }

  console.log("\n✅ All shows processed successfully!");
}

async function checkAndUpdateShow(
  show: Pick<Show, "id" | "name" | "mazeId" | "ended">
): Promise<boolean> {
  try {
    const tvMazeShow = await fetchShowFromAPI(show.mazeId);

    if (!tvMazeShow) {
      console.log(`Show not found in TVMaze API: ${show.name}`);
      return false;
    }

    // Check if the show has ended
    if (tvMazeShow.ended) {
      const endDate = new Date(tvMazeShow.ended);
      await updateShowEndDate(show.id, endDate);
      console.log(
        `Updated show: ${show.name} - ended on ${endDate.toISOString().split("T")[0]}`
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to check show ${show.name}:`, error);
    throw error;
  }
}

async function fetchShowFromAPI(
  mazeId: string,
  retryCount = 0
): Promise<TVMazeShowResponse | null> {
  const maxRetries = 3;

  try {
    const response = await axios.get(`${TV_GET_API_PREFIX}${mazeId}`);
    return response.data as TVMazeShowResponse;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      // Handle rate limiting with retry logic
      if (error.response?.status === 429 && retryCount < maxRetries) {
        console.log(
          `Rate limited, waiting 5 seconds... (attempt ${retryCount + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return await fetchShowFromAPI(mazeId, retryCount + 1);
      }

      // Handle show not found
      if (error.response?.status === 404) {
        console.log(`Show with mazeId ${mazeId} not found in TVMaze API`);
        return null;
      }

      // Handle other HTTP errors
      if (error.response?.status) {
        console.error(
          `HTTP error ${error.response.status} for mazeId ${mazeId}:`,
          error.message
        );
        throw error;
      }
    }

    // Handle network or other errors
    console.error(`Network/unknown error for mazeId ${mazeId}:`, error);
    throw error;
  }
}

async function updateShowEndDate(showId: string, endDate: Date): Promise<void> {
  try {
    await prisma.show.update({
      where: {
        id: showId,
      },
      data: {
        ended: endDate,
      },
    });
  } catch (error) {
    console.error(`Failed to update show ${showId} end date:`, error);
    throw error;
  }
}

// Environment validation
const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

// Execute the update process
updateShowStatuses().catch((error) => {
  console.error("Show status update process failed:", error);
  process.exit(1);
});
