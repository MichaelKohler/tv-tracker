import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { logout } from "../session.server";

export function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export function loader() {
  return redirect("/");
}
