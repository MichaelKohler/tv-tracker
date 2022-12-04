/*
  Warnings:

  - Added the required column `showId` to the `EpisodeOnUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `EpisodeOnUser` ADD COLUMN `showId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `EpisodeOnUser_episodeId_showId_idx` ON `EpisodeOnUser`(`episodeId`, `showId`);

-- CreateIndex
CREATE INDEX `EpisodeOnUser_showId_idx` ON `EpisodeOnUser`(`showId`);
