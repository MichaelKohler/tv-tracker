import { requireUserId } from "../session.server";

import { loader } from "./metrics";

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
  const result = await loader({
    request: new Request("http://localhost:8080/metrics"),
    context: {},
    params: {},
  });
  const text = await result.text();

  expect(result.headers.get("Content-Type")).toBe("text/plain");

  expect(text).toContain("# HELP show_count The total number of shows.");
  expect(text).toContain("# TYPE show_count gauge");
  expect(text).toContain("show_count 55");

  expect(text).toContain(
    "# HELP connected_show_count The total number of connected shows."
  );
  expect(text).toContain("# TYPE connected_show_count gauge");
  expect(text).toContain("connected_show_count 53");

  expect(text).toContain("# HELP episode_count The total number of episodes.");
  expect(text).toContain("# TYPE episode_count gauge");
  expect(text).toContain("episode_count 2000");

  expect(text).toContain(
    "# HELP connected_episode_count The total number of connected episodes."
  );
  expect(text).toContain("# TYPE connected_episode_count gauge");
  expect(text).toContain("connected_episode_count 1500");

  expect(text).toContain("# HELP user_count The total number of users.");
  expect(text).toContain("# TYPE user_count gauge");
  expect(text).toContain("user_count 5");
});

test("loader throws error if no user", async () => {
  vi.mocked(requireUserId).mockImplementation(() => {
    throw new Error("no user");
  });

  await expect(async () => {
    await loader({
      request: new Request("http://localhost:8080/metrics"),
      context: {},
      params: {},
    });
  }).rejects.toThrowError("no user");
});
