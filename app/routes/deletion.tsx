import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";

import { deleteUserByUserId } from "../models/user.server";
import { requireUserId, logout } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);

  try {
    await deleteUserByUserId(userId);
  } catch (error) {
    console.error("DELETE_USER_ERROR", error);

    return json(
      { errors: { deletion: "Could not delete user. Please try again." } },
      { status: 500 }
    );
  }

  return logout(request);
}

export default function DeletionPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <main className="mx-auto my-12 flex min-h-full w-full max-w-md flex-col px-8">
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

        <button
          type="submit"
          className="rounded bg-red-700 px-4 py-2 text-center text-white hover:bg-red-500 active:bg-red-500"
          disabled={!!navigation.formData}
        >
          {navigation.formData ? (
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
