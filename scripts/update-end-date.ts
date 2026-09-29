import type { Show } from "@prisma/client";

import { prisma } from "../app/db.server";

const END_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date: Date | null) {
  return date ? date.toISOString().split("T")[0] : "none";
}

function parseEndDate(rawEndDate: string): Date | null {
  if (rawEndDate === "") {
    return null;
  }

  if (!END_DATE_PATTERN.test(rawEndDate)) {
    throw new Error(
      `TV_SHOW_END_DATE "${rawEndDate}" must be in the format YYYY-MM-DD`
    );
  }

  const endDate = new Date(`${rawEndDate}T00:00:00.000Z`);

  if (isNaN(endDate.getTime()) || formatDate(endDate) !== rawEndDate) {
    throw new Error(`TV_SHOW_END_DATE "${rawEndDate}" is not a valid date`);
  }

  return endDate;
}

async function updateEndDate(showName: Show["name"], endDate: Date | null) {
  console.log(`Fetching show ${showName} from DB..`);
  const show = await prisma.show.findFirst({
    where: {
      name: showName,
    },
  });

  if (!show) {
    throw new Error("EXISTING_SHOW_NOT_FOUND");
  }

  console.log(`Current end date: ${formatDate(show.ended)}`);

  if (endDate) {
    console.log(
      `Setting end date for show ${showName} to ${formatDate(endDate)}...`
    );
  } else {
    console.log(`Removing end date for show ${showName}...`);
  }

  await prisma.show.update({
    where: {
      id: show.id,
    },
    data: {
      ended: endDate,
    },
  });

  console.log(`New end date: ${formatDate(endDate)}`);
  console.log("Done!");
}

const { DATABASE_URL, TV_SHOW_NAME, TV_SHOW_END_DATE } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not provided");
  process.exit(1);
}

if (!TV_SHOW_NAME) {
  console.error("TV_SHOW_NAME not provided");
  process.exit(1);
}

let endDate: Date | null;

try {
  endDate = parseEndDate((TV_SHOW_END_DATE ?? "").trim());
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

updateEndDate(TV_SHOW_NAME, endDate).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
