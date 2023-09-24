import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { logout } from "../session.server";

export function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export function loader() {
  return redirect("/");
}
