import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import * as Sentry from "@sentry/node";

import { logout } from "../session.server";

export function action({ request }: ActionFunctionArgs) {
  Sentry.metrics.increment("logout", 1, {});

  return logout(request);
}

export function loader() {
  return redirect("/");
}
