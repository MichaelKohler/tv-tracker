-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plexToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mazeId" TEXT NOT NULL,
    "premiered" TIMESTAMP(3) NOT NULL,
    "ended" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowOnUser" (
    "id" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "showId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ShowOnUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "mazeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "airDate" TIMESTAMP(3) NOT NULL,
    "runtime" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "showId" TEXT NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeOnUser" (
    "id" TEXT NOT NULL,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "episodeId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EpisodeOnUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_plexToken_key" ON "User"("plexToken");

-- CreateIndex
CREATE INDEX "User_plexToken_idx" ON "User"("plexToken");

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Show_mazeId_key" ON "Show"("mazeId");

-- CreateIndex
CREATE INDEX "Show_mazeId_idx" ON "Show"("mazeId");

-- CreateIndex
CREATE INDEX "ShowOnUser_userId_idx" ON "ShowOnUser"("userId");

-- CreateIndex
CREATE INDEX "ShowOnUser_showId_idx" ON "ShowOnUser"("showId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowOnUser_showId_userId_key" ON "ShowOnUser"("showId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_mazeId_key" ON "Episode"("mazeId");

-- CreateIndex
CREATE INDEX "Episode_showId_idx" ON "Episode"("showId");

-- CreateIndex
CREATE INDEX "Episode_imageUrl_idx" ON "Episode"("imageUrl");

-- CreateIndex
CREATE INDEX "EpisodeOnUser_userId_idx" ON "EpisodeOnUser"("userId");

-- CreateIndex
CREATE INDEX "EpisodeOnUser_userId_ignored_idx" ON "EpisodeOnUser"("userId", "ignored");

-- CreateIndex
CREATE INDEX "EpisodeOnUser_episodeId_showId_idx" ON "EpisodeOnUser"("episodeId", "showId");

-- CreateIndex
CREATE INDEX "EpisodeOnUser_episodeId_idx" ON "EpisodeOnUser"("episodeId");

-- CreateIndex
CREATE INDEX "EpisodeOnUser_showId_idx" ON "EpisodeOnUser"("showId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeOnUser_episodeId_showId_userId_key" ON "EpisodeOnUser"("episodeId", "showId", "userId");

