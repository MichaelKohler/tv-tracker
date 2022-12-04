/*
  Warnings:

  - You are about to drop the column `userId` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Show` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Episode_userId_idx` ON `Episode`;

-- DropIndex
DROP INDEX `Show_userId_idx` ON `Show`;

-- AlterTable
ALTER TABLE `Episode` DROP COLUMN `userId`;

-- AlterTable
ALTER TABLE `Show` DROP COLUMN `userId`;

-- CreateTable
CREATE TABLE `ShowOnUser` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `showId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `ShowOnUser_userId_idx`(`userId`),
    INDEX `ShowOnUser_showId_idx`(`showId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EpisodeOnUser` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `EpisodeOnUser_userId_idx`(`userId`),
    INDEX `EpisodeOnUser_episodeId_idx`(`episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
