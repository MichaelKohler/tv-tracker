import { getShowCount, getConnectedShowCount } from "../models/show.server";
import { withRequestContext } from "../request-handler.server";
import {
  getEpisodeCount,
  getConnectedEpisodeCount,
} from "../models/episode.server";
import { getUserCount } from "../models/user.server";
import { logInfo } from "../logger.server";

const helpMessage = (metric: string, description: string) =>
  `# HELP ${metric} ${description}`;
const typeMessage = (metric: string, type: "gauge") =>
  `# TYPE ${metric} ${type}`;
const metricValue = (metric: string, value: number) => `${metric} ${value}`;

export const loader = withRequestContext(async () => {
  logInfo("Metrics endpoint accessed", {});
  const [
    showCount,
    connectedShowCount,
    episodeCount,
    connectedEpisodeCount,
    userCount,
  ] = await Promise.all([
    getShowCount(),
    getConnectedShowCount(),
    getEpisodeCount(),
    getConnectedEpisodeCount(),
    getUserCount(),
  ]);

  const metrics = [
    helpMessage("show_count", "The total number of shows."),
    typeMessage("show_count", "gauge"),
    metricValue("show_count", showCount),
    helpMessage("connected_show_count", "The total number of connected shows."),
    typeMessage("connected_show_count", "gauge"),
    metricValue("connected_show_count", connectedShowCount),
    helpMessage("episode_count", "The total number of episodes."),
    typeMessage("episode_count", "gauge"),
    metricValue("episode_count", episodeCount),
    helpMessage(
      "connected_episode_count",
      "The total number of connected episodes."
    ),
    typeMessage("connected_episode_count", "gauge"),
    metricValue("connected_episode_count", connectedEpisodeCount),
    helpMessage("user_count", "The total number of users."),
    typeMessage("user_count", "gauge"),
    metricValue("user_count", userCount),
  ];

  return new Response(metrics.join("\n"), {
    headers: { "Content-Type": "text/plain" },
  });
});
