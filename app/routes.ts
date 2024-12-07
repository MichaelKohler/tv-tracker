import { flatRoutes } from "@remix-run/fs-routes";

export default flatRoutes({
  ignoredRouteFiles: ["**/.*", "**/*.css", "**/*.test.{js,jsx,ts,tsx}"],
});
