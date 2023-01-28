import { requireUserId } from "../session.server";

import { loader } from "./kpi";

beforeEach(() => {
  vi.mock("../models/show.server", async () => {
    return {
      getShowCount: vi.fn().mockResolvedValue(55),
      getConnectedShowCount: vi.fn().mockResolvedValue(53),
    };
  });
  vi.mock("../models/episode.server", async () => {
    return {
      getEpisodeCount: vi.fn().mockResolvedValue(2000),
      getConnectedEpisodeCount: vi.fn().mockResolvedValue(1500),
    };
  });
  vi.mock("../models/user.server", async () => {
    return {
      getUserCount: vi.fn().mockResolvedValue(5),
    };
  });
  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue(true),
    };
  });
});

test("loader returns stats", async () => {
  const response = await loader({
    request: new Request("http://localhost:8080/kpi"),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result).toStrictEqual({
    showCount: 55,
    connectedShowCount: 53,
    episodeCount: 2000,
    connectedEpisodeCount: 1500,
    userCount: 5,
  });
});

test("loader throws error if no user", async () => {
  vi.mocked(requireUserId).mockImplementation(() => {
    throw new Error("no user");
  });

  await expect(async () => {
    await loader({
      request: new Request("http://localhost:8080/kpi"),
      context: {},
      params: {},
    });
  }).rejects.toThrowError("no user");
});
