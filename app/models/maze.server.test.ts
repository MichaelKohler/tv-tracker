import {
  fetchShowWithEmbededEpisodes,
  fetchSearchResults,
  TVMazeAPIError,
} from "./maze.server";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("maze.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("TVMazeAPIError", () => {
    it("should create error with message and status code", () => {
      const error = new TVMazeAPIError("Test error", 404);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("TVMazeAPIError");
    });

    it("should create error with cause", () => {
      const cause = new Error("Original error");
      const error = new TVMazeAPIError("Test error", 500, cause);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.cause).toBe(cause);
    });
  });

  describe("fetchShowWithEmbededEpisodes", () => {
    it("should successfully fetch show with episodes", async () => {
      const mockResponse = {
        id: 123,
        name: "Test Show",
        _embedded: {
          episodes: [{ id: 1, name: "Episode 1" }],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await fetchShowWithEmbededEpisodes("123");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.tvmaze.com/shows/123?&embed=episodes",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should throw error on HTTP 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      });

      await expect(fetchShowWithEmbededEpisodes("999")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("999")).rejects.toThrow(
        "Failed to fetch show with ID 999: Not Found"
      );

      try {
        await fetchShowWithEmbededEpisodes("999");
      } catch (error) {
        expect(error).toBeInstanceOf(TVMazeAPIError);
        if (error instanceof TVMazeAPIError) {
          expect(error.statusCode).toBe(404);
        }
      }
    });

    it("should throw error on HTTP 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Failed to fetch show with ID 123: Internal Server Error"
      );
    });

    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Network error while fetching URL"
      );
    });

    it("should throw error on JSON parse failure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Failed to parse JSON response from URL"
      );
    });

    it("should throw error on timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockFetch.mockRejectedValue(abortError);

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Request timeout after 10000ms"
      );
    });

    it("should throw error on invalid response format (null)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      });

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Invalid response format for show with ID 123"
      );
    });

    it("should throw error on invalid response format (string)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => "invalid",
      });

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Invalid response format for show with ID 123"
      );
    });

    it("should throw error on invalid response format (number)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => 123,
      });

      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        TVMazeAPIError
      );
      await expect(fetchShowWithEmbededEpisodes("123")).rejects.toThrow(
        "Invalid response format for show with ID 123"
      );
    });
  });

  describe("fetchSearchResults", () => {
    it("should successfully fetch search results", async () => {
      const mockResponse = [
        { show: { id: 1, name: "Show 1" } },
        { show: { id: 2, name: "Show 2" } },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await fetchSearchResults("test");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.tvmaze.com/search/shows?q=test",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should successfully fetch empty search results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await fetchSearchResults("nonexistent");

      expect(result).toEqual([]);
    });

    it("should throw error on HTTP 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      });

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        'Failed to search for shows with query "test": Not Found'
      );

      try {
        await fetchSearchResults("test");
      } catch (error) {
        expect(error).toBeInstanceOf(TVMazeAPIError);
        if (error instanceof TVMazeAPIError) {
          expect(error.statusCode).toBe(404);
        }
      }
    });

    it("should throw error on HTTP 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        'Failed to search for shows with query "test": Internal Server Error'
      );
    });

    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        "Network error while fetching URL"
      );
    });

    it("should throw error on JSON parse failure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        "Failed to parse JSON response from URL"
      );
    });

    it("should throw error on timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockFetch.mockRejectedValue(abortError);

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        "Request timeout after 10000ms"
      );
    });

    it("should throw error on invalid response format (object)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ invalid: "object" }),
      });

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        'Invalid response format for search query "test": expected array'
      );
    });

    it("should throw error on invalid response format (null)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      });

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        'Invalid response format for search query "test": expected array'
      );
    });

    it("should throw error on invalid response format (string)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => "invalid",
      });

      await expect(fetchSearchResults("test")).rejects.toThrow(TVMazeAPIError);
      await expect(fetchSearchResults("test")).rejects.toThrow(
        'Invalid response format for search query "test": expected array'
      );
    });
  });
});
