-- AlterTable
ALTER TABLE `Show` MODIFY `rating` DOUBLE NULL,
    MODIFY `imdb` VARCHAR(191) NULL,
    MODIFY `image_url` VARCHAR(191) NULL,
    MODIFY `summary` TEXT NOT NULL;
