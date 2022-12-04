import * as React from "react";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";

import { deleteUserByUserId } from "~/models/user.server";
import { requireUserId, logout } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  return null;
}

export async function action({ request }: ActionArgs) {
  const userId = await requireUserId(request);

  try {
    await deleteUserByUserId(userId);
  } catch (error) {
    return json(
      { errors: { deletion: "Could not delete user. Please try again." } },
      { status: 500 }
    );
  }

  return logout(request);
}

export default function DeletionPage() {
  const actionData = useActionData<typeof action>();
  const transition = useTransition();

  return (
    <main className="my-12 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <Form
        method="post"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "100%",
        }}
      >
        {actionData?.errors.deletion && (
          <div className="pt-1 text-red-700" id="deletion=error">
            {actionData.errors.deletion}
          </div>
        )}

        <p>
          Are you sure you want to delete your account? This will also delete
          all your saved data. Once deleted, this data can't be restored.
        </p>
        <p>
          If you think you might use this service again in the future, you can{" "}
          <a
            href="/export"
            className="text-blue-500 underline"
            target="_blank"
          >
            export
          </a>{" "}
          your data and later on import it on a new account again. Right-click
          the "export" link and choose "Save as" to export all your data into a
          file on your computer.
        </p>

        <button
          type="submit"
          className="rounded bg-red-700 py-2 px-4 text-center text-white hover:bg-red-500 active:bg-red-500"
          disabled={!!transition.submission}
        >
          {transition.submission ? (
            <div
              className="spinner-border inline-block h-4 w-4 animate-spin rounded-full border-2"
              role="status"
            ></div>
          ) : (
            "Delete my account and all data"
          )}
        </button>
      </Form>
    </main>
  );
}
