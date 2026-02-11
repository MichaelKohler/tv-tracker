import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seed() {
  const email = "rachel@remix.run";

  await prisma.episodeOnUser.deleteMany({});
  await prisma.episode.deleteMany({});
  await prisma.showOnUser.deleteMany({});
  await prisma.show.deleteMany({});
  await prisma.passkey.deleteMany({});
  await prisma.password.deleteMany({});
  await prisma.user.deleteMany({});

  const hashedPassword = await bcrypt.hash("rachelrox", 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
      passkeys: {
        create: {
          credentialId: "test-credential-id-12345",
          publicKey: Buffer.from("test-public-key-data"),
          counter: BigInt(0),
          transports: ["usb", "nfc"],
          name: "YubiKey 5",
        },
      },
    },
  });

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setMonth(oneYearAgo.getMonth() - 4);

  const show1 = await prisma.show.create({
    data: {
      name: "Breaking Bad",
      mazeId: "169",
      premiered: new Date("2008-01-20"),
      ended: new Date("2013-09-29"),
      rating: 9.5,
      imageUrl:
        "https://static.tvmaze.com/uploads/images/medium_portrait/0/2400.jpg",
      summary:
        "A high school chemistry teacher turned methamphetamine manufacturer.",
    },
  });

  await prisma.showOnUser.create({
    data: {
      userId: user.id,
      showId: show1.id,
      archived: false,
    },
  });

  const breakingBadEpisodes = [];
  const episodeDate = new Date("2008-01-20");

  for (let season = 1; season <= 6; season++) {
    const episodesInSeason = season <= 4 ? 8 : season === 5 ? 16 : 12;
    for (let episodeNum = 1; episodeNum <= episodesInSeason; episodeNum++) {
      const episode = await prisma.episode.create({
        data: {
          mazeId: `bb-s${season}e${episodeNum}`,
          name: `Season ${season} Episode ${episodeNum}`,
          season,
          number: episodeNum,
          airDate: new Date(episodeDate),
          runtime: 47,
          imageUrl:
            "https://static.tvmaze.com/uploads/images/large_landscape/405/1012787.jpg",
          summary: `Episode ${episodeNum} of season ${season}.`,
          showId: show1.id,
        },
      });
      breakingBadEpisodes.push(episode);
      episodeDate.setDate(episodeDate.getDate() + 7);
    }
  }

  const watchDates = [
    { monthsAgo: 14, count: 3 },
    { monthsAgo: 13, count: 5 },
    { monthsAgo: 12, count: 2 },
    { monthsAgo: 11, count: 7 },
    { monthsAgo: 10, count: 4 },
    { monthsAgo: 9, count: 6 },
    { monthsAgo: 8, count: 1 },
    { monthsAgo: 7, count: 5 },
    { monthsAgo: 6, count: 3 },
    { monthsAgo: 5, count: 4 },
    { monthsAgo: 4, count: 8 },
    { monthsAgo: 3, count: 3 },
    { monthsAgo: 2, count: 6 },
    { monthsAgo: 1, count: 2 },
  ];

  let episodeIndex = 0;
  for (const { monthsAgo, count } of watchDates) {
    for (
      let i = 0;
      i < count && episodeIndex < breakingBadEpisodes.length;
      i++
    ) {
      const watchDate = new Date(now);
      watchDate.setMonth(watchDate.getMonth() - monthsAgo);
      watchDate.setDate(Math.floor(Math.random() * 28) + 1);

      await prisma.episodeOnUser.create({
        data: {
          userId: user.id,
          showId: show1.id,
          episodeId: breakingBadEpisodes[episodeIndex].id,
          ignored: false,
          createdAt: watchDate,
          updatedAt: watchDate,
        },
      });
      episodeIndex++;
    }
  }

  const show2 = await prisma.show.create({
    data: {
      name: "Stranger Things",
      mazeId: "2993",
      premiered: new Date("2016-07-15"),
      ended: null,
      rating: 8.7,
      imageUrl:
        "https://static.tvmaze.com/uploads/images/medium_portrait/595/1489169.jpg",
      summary: "Strange things are happening in the town of Hawkins.",
    },
  });

  await prisma.showOnUser.create({
    data: {
      userId: user.id,
      showId: show2.id,
      archived: false,
    },
  });

  const strangerThingsEpisodes = [];
  for (let i = 1; i <= 6; i++) {
    const episode = await prisma.episode.create({
      data: {
        mazeId: `st-s1e${i}`,
        name: `Chapter ${i}`,
        season: 1,
        number: i,
        airDate: new Date("2016-07-15"),
        runtime: 50,
        imageUrl:
          "https://static.tvmaze.com/uploads/images/large_landscape/605/1513118.jpg",
        summary: `Chapter ${i} of Stranger Things.`,
        showId: show2.id,
      },
    });
    strangerThingsEpisodes.push(episode);
  }

  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  await prisma.episodeOnUser.create({
    data: {
      userId: user.id,
      showId: show2.id,
      episodeId: strangerThingsEpisodes[0].id,
      ignored: false,
      createdAt: twoMonthsAgo,
      updatedAt: twoMonthsAgo,
    },
  });

  for (let i = 1; i < strangerThingsEpisodes.length; i++) {
    await prisma.episodeOnUser.create({
      data: {
        userId: user.id,
        showId: show2.id,
        episodeId: strangerThingsEpisodes[i].id,
        ignored: true,
      },
    });
  }

  const show3 = await prisma.show.create({
    data: {
      name: "The Office",
      mazeId: "526",
      premiered: new Date("2005-03-24"),
      ended: new Date("2013-05-16"),
      rating: 8.8,
      imageUrl:
        "https://static.tvmaze.com/uploads/images/medium_portrait/481/1204342.jpg",
      summary: "A mockumentary on a group of typical office workers.",
    },
  });

  await prisma.showOnUser.create({
    data: {
      userId: user.id,
      showId: show3.id,
      archived: true,
    },
  });

  for (let season = 1; season <= 2; season++) {
    for (let episodeNum = 1; episodeNum <= 8; episodeNum++) {
      await prisma.episode.create({
        data: {
          mazeId: `office-s${season}e${episodeNum}`,
          name: `The Office S${season}E${episodeNum}`,
          season,
          number: episodeNum,
          airDate: new Date(`200${4 + season}-03-24`),
          runtime: 22,
          imageUrl:
            "https://static.tvmaze.com/uploads/images/large_landscape/195/488794.jpg",
          summary: `Episode ${episodeNum} of The Office season ${season}.`,
          showId: show3.id,
        },
      });
    }
  }

  const show4 = await prisma.show.create({
    data: {
      name: "The Mandalorian",
      mazeId: "38963",
      premiered: new Date("2019-11-12"),
      ended: null,
      rating: 8.9,
      imageUrl:
        "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253498.jpg",
      summary:
        "The travels of a lone bounty hunter in the outer reaches of the galaxy.",
    },
  });

  await prisma.showOnUser.create({
    data: {
      userId: user.id,
      showId: show4.id,
      archived: false,
    },
  });

  const mandoEpisodes = [];
  for (let season = 1; season <= 3; season++) {
    for (let episodeNum = 1; episodeNum <= 8; episodeNum++) {
      const episode = await prisma.episode.create({
        data: {
          mazeId: `mando-s${season}e${episodeNum}`,
          name: `Chapter ${(season - 1) * 8 + episodeNum}`,
          season,
          number: episodeNum,
          airDate: new Date(2018 + season, 10, 12),
          runtime: 40,
          imageUrl:
            "https://static.tvmaze.com/uploads/images/large_landscape/457/1144719.jpg",
          summary: `Chapter ${(season - 1) * 8 + episodeNum} of The Mandalorian.`,
          showId: show4.id,
        },
      });
      mandoEpisodes.push(episode);
    }
  }

  const futureDate = new Date(2099, 0, 1);
  for (let episodeNum = 1; episodeNum <= 8; episodeNum++) {
    const episodeAirDate = new Date(futureDate);
    episodeAirDate.setDate(episodeAirDate.getDate() + (episodeNum - 1) * 7);

    await prisma.episode.create({
      data: {
        mazeId: `mando-s4e${episodeNum}`,
        name: `Chapter ${24 + episodeNum}`,
        season: 4,
        number: episodeNum,
        airDate: episodeAirDate,
        runtime: 40,
        imageUrl:
          "https://static.tvmaze.com/uploads/images/large_landscape/457/1144719.jpg",
        summary: `Upcoming Chapter ${24 + episodeNum} of The Mandalorian.`,
        showId: show4.id,
      },
    });
  }

  const mandoMonthsAgo = [
    15, 15, 14, 13, 13, 12, 11, 11, 10, 9, 9, 8, 7, 6, 6, 5, 4, 4, 3, 3, 2, 2,
  ];
  for (let i = 0; i < mandoEpisodes.length && i < mandoMonthsAgo.length; i++) {
    const watchDate = new Date(now);
    watchDate.setMonth(watchDate.getMonth() - mandoMonthsAgo[i]);
    watchDate.setDate(5 + (i % 25));

    await prisma.episodeOnUser.create({
      data: {
        userId: user.id,
        showId: show4.id,
        episodeId: mandoEpisodes[i].id,
        ignored: false,
        createdAt: watchDate,
        updatedAt: watchDate,
      },
    });
  }

  console.log(`Database has been seeded. 🌱`);
  console.log(`Created user: ${email}`);
  console.log(`Created 4 shows with multiple episodes`);
  console.log(
    `- Breaking Bad: 50 episodes across 5 seasons (50 episodes watched over past year)`
  );
  console.log(`- Stranger Things: 6 episodes (1 watched, 5 ignored)`);
  console.log(`- The Office: 16 episodes (archived, unwatched)`);
  console.log(
    `- The Mandalorian: 32 episodes (18 watched, 6 unwatched, 8 upcoming)`
  );
  console.log(`Added 1 passkey for the user`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
