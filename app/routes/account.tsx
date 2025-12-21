import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useLoaderData } from "react-router";

import { requireUser } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return { user };
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Account",
    },
  ];
};

export default function Account() {
  const { user } = useLoaderData() as { user: { email: string; plexToken: string } };

  return (
    <main className="mx-auto my-8 flex min-h-full w-full max-w-md flex-col px-8">
      <h1 className="text-2xl font-bold">Account</h1>
      <p>Email: {user.email}</p>
      <p>Plex Token: {user.plexToken}</p>
    </main>
  );
}
