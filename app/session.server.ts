import { redirect } from "react-router";
import { auth } from "./auth.server";

export async function getSession(request: Request) {
  return auth.getSession(request);
}

export async function getUserId(request: Request) {
  const session = await getSession(request);
  return session?.user?.id;
}

export async function getUser(request: Request) {
  const session = await getSession(request);
  return session?.user;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const user = await getUser(request);
  if (user) return user;

  throw await logout(request);
}

export async function logout(request: Request) {
  const { session } = await auth.getSession(request);
  if (!session) {
    return redirect("/");
  }

  const cookie = await auth.destroySession(session);

  return redirect("/", {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}
