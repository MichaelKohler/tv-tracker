import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import * as Sentry from "@sentry/remix";

import { logout } from "../session.server";

export function action({ request }: ActionFunctionArgs) {
  Sentry.metrics.increment("logout", 1, {});

  return logout(request);
}

export function loader() {
  return redirect("/");
}
