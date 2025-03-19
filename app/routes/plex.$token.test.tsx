import type { ActionFunctionArgs } from "react-router";
import { action } from "./plex.$token";
import {
  getEpisodeByShowIdAndNumbers,
  markEpisodeAsWatched,
} from "../models/episode.server";
import { getShowByUserIdAndName } from "../models/show.server";
import { getUserByPlexToken } from "../models/user.server";

vi.mock("../models/episode.server");
vi.mock("../models/show.server");
vi.mock("../models/user.server");

// Use consistent mock objects that match the structure from other tests
const mockUser = {
  id: "user123",
  createdAt: new Date(),
  updatedAt: new Date(),
  email: "foo@example.com",
  plexToken: "token123",
};

const mockShow = {
  id: "show456",
  createdAt: new Date(),
  updatedAt: new Date(),
  premiered: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "maze456",
  name: "Show Title",
  summary: "Test Summary",
  ended: null,
  rating: 8.5,
};

const mockEpisode = {
  id: "episode789",
  createdAt: new Date(),
  updatedAt: new Date(),
  airDate: new Date(),
  date: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "maze789",
  name: "Declaration of Love",
  number: 7,
  season: 3,
  runtime: 44,
  showId: "show456",
  summary: "Test Summary",
  show: mockShow,
};

type PlexMetadata = {
  grandparentTitle: string;
  parentIndex: number;
  index: number;
};

type PlexPayload = {
  event: string;
  Metadata: PlexMetadata;
};

const createPlexPayload = (
  overrides: Partial<PlexPayload> = {}
): PlexPayload => ({
  event: "media.scrobble",
  Metadata: {
    grandparentTitle: "Show Title",
    parentIndex: 3,
    index: 7,
  },
  ...overrides,
});

describe("Plex token route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUserByPlexToken).mockResolvedValue(mockUser);
    vi.mocked(getShowByUserIdAndName).mockResolvedValue(mockShow);
    vi.mocked(getEpisodeByShowIdAndNumbers).mockResolvedValue(mockEpisode);
    vi.mocked(markEpisodeAsWatched).mockResolvedValue(undefined);
  });

  test("marks episode as watched for valid scrobble event", async () => {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(createPlexPayload()));

    const response = await action({
      request: new Request("http://localhost:8080/plex/token123", {
        method: "POST",
        body: formData,
      }),
      params: { token: "token123" },
      context: {},
    } as ActionFunctionArgs);

    expect(getUserByPlexToken).toHaveBeenCalledWith("token123");
    expect(getShowByUserIdAndName).toHaveBeenCalledWith({
      userId: mockUser.id,
      name: "Show Title",
    });
    expect(getEpisodeByShowIdAndNumbers).toHaveBeenCalledWith({
      showId: mockShow.id,
      season: 3,
      episode: 7,
    });
    expect(markEpisodeAsWatched).toHaveBeenCalledWith({
      userId: mockUser.id,
      episodeId: mockEpisode.id,
      showId: mockShow.id,
    });
    expect(response).toEqual({});
  });

  test("returns null for non-scrobble event", async () => {
    const formData = new FormData();
    formData.append(
      "payload",
      JSON.stringify(createPlexPayload({ event: "media.play" }))
    );

    const response = await action({
      request: new Request("http://localhost:8080/plex/token123", {
        method: "POST",
        body: formData,
      }),
      params: { token: "token123" },
      context: {},
    } as ActionFunctionArgs);

    expect(getUserByPlexToken).not.toHaveBeenCalled();
    expect(response).toBeNull();
  });

  test("returns null for missing token", async () => {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(createPlexPayload()));

    const response = await action({
      request: new Request("http://localhost:8080/plex/", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as ActionFunctionArgs);

    expect(getUserByPlexToken).not.toHaveBeenCalled();
    expect(response).toBeNull();
  });

  test("returns empty object when user not found", async () => {
    vi.mocked(getUserByPlexToken).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("payload", JSON.stringify(createPlexPayload()));

    const response = await action({
      request: new Request("http://localhost:8080/plex/token123", {
        method: "POST",
        body: formData,
      }),
      params: { token: "token123" },
      context: {},
    } as ActionFunctionArgs);

    expect(getUserByPlexToken).toHaveBeenCalledWith("token123");
    expect(getShowByUserIdAndName).not.toHaveBeenCalled();
    expect(response).toEqual({});
  });

  test("returns empty object when show not found", async () => {
    vi.mocked(getShowByUserIdAndName).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("payload", JSON.stringify(createPlexPayload()));

    const response = await action({
      request: new Request("http://localhost:8080/plex/token123", {
        method: "POST",
        body: formData,
      }),
      params: { token: "token123" },
      context: {},
    } as ActionFunctionArgs);

    expect(getUserByPlexToken).toHaveBeenCalledWith("token123");
    expect(getShowByUserIdAndName).toHaveBeenCalled();
    expect(getEpisodeByShowIdAndNumbers).not.toHaveBeenCalled();
    expect(response).toEqual({});
  });

  test("returns empty object when episode not found", async () => {
    vi.mocked(getEpisodeByShowIdAndNumbers).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("payload", JSON.stringify(createPlexPayload()));

    const response = await action({
      request: new Request("http://localhost:8080/plex/token123", {
        method: "POST",
        body: formData,
      }),
      params: { token: "token123" },
      context: {},
    } as ActionFunctionArgs);

    expect(getUserByPlexToken).toHaveBeenCalledWith("token123");
    expect(getShowByUserIdAndName).toHaveBeenCalled();
    expect(getEpisodeByShowIdAndNumbers).toHaveBeenCalled();
    expect(markEpisodeAsWatched).not.toHaveBeenCalled();
    expect(response).toEqual({});
  });

  test("returns empty object when marking as watched throws", async () => {
    vi.mocked(markEpisodeAsWatched).mockRejectedValue(new Error("DB error"));

    const formData = new FormData();
    formData.append("payload", JSON.stringify(createPlexPayload()));

    const response = await action({
      request: new Request("http://localhost:8080/plex/token123", {
        method: "POST",
        body: formData,
      }),
      params: { token: "token123" },
      context: {},
    } as ActionFunctionArgs);

    expect(markEpisodeAsWatched).toHaveBeenCalled();
    expect(response).toEqual({});
  });
});
