/*
  Warnings:

  - You are about to drop the column `air_date` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `maze_id` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `Show` table. All the data in the column will be lost.
  - You are about to drop the column `maze_id` on the `Show` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mazeId]` on the table `Show` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `airDate` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mazeId` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mazeId` to the `Show` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Show_maze_id_idx` ON `Show`;

-- DropIndex
DROP INDEX `Show_maze_id_key` ON `Show`;

-- AlterTable
ALTER TABLE `Episode` DROP COLUMN `air_date`,
    DROP COLUMN `image_url`,
    DROP COLUMN `maze_id`,
    ADD COLUMN `airDate` DATETIME(3) NOT NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NOT NULL,
    ADD COLUMN `mazeId` VARCHAR(191) NOT NULL,
    MODIFY `summary` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Show` DROP COLUMN `image_url`,
    DROP COLUMN `maze_id`,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `mazeId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Show_mazeId_key` ON `Show`(`mazeId`);

-- CreateIndex
CREATE INDEX `Show_mazeId_idx` ON `Show`(`mazeId`);
