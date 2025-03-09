import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData();
  console.log("Plex... body:", body);
  return {};
}
