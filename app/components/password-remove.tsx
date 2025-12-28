import { useEffect, useState, type FormEvent } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useActionData, useSubmit } from "react-router";

import type { action } from "../routes/account";

interface PasswordRemoveProps {
  hasPassword: boolean;
  hasPasskeys: boolean;
}

export function PasswordRemove({
  hasPassword,
  hasPasskeys,
}: PasswordRemoveProps) {
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (
      actionData &&
      "intent" in actionData &&
      actionData.intent === "remove-password"
    ) {
      setIsRemoving(false);
    }
    if (actionData?.errors?.generic) {
      setIsRemoving(false);
    }
  }, [actionData]);

  async function handleRemovePassword(e: FormEvent) {
    e.preventDefault();

    if (
      !confirm(
        "Are you sure you want to remove your password? You will only be able to log in with passkeys."
      )
    ) {
      return;
    }

    setIsRemoving(true);

    try {
      const optionsResponse = await fetch("/passkey/login-options");
      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const options = await optionsResponse.json();
      const credential = await startAuthentication(options);

      const formData = new FormData();
      formData.append("intent", "remove-password");
      formData.append("passkeyCredential", JSON.stringify(credential));

      submit(formData, { method: "post" });
    } catch (error) {
      setIsRemoving(false);
      console.error("Passkey authentication failed:", error);
    }
  }

  if (!hasPassword) {
    return (
      <>
        <hr className="my-8" />
        <div className="rounded border border-mk-text p-4">
          <p className="text-sm text-mk-text">
            You don&apos;t have a password set. You can only log in with
            passkeys.
          </p>
        </div>
      </>
    );
  }

  if (!hasPasskeys) {
    return null;
  }

  return (
    <>
      <hr className="my-8" />

      <h2 className="text-xl font-bold">Remove Password</h2>
      <p className="my-4 text-mk-text">
        Remove your password and rely solely on passkeys for authentication. You
        must have at least one passkey registered to remove your password.
      </p>

      <form onSubmit={handleRemovePassword}>
        <button
          type="submit"
          disabled={isRemoving}
          className="rounded bg-mkerror py-2 px-4 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
        >
          {isRemoving ? "Removing Password..." : "Remove Password"}
        </button>

        {actionData?.errors?.generic && (
          <p className="mt-2 text-mkerror">{actionData.errors.generic}</p>
        )}

        {actionData?.done &&
          "intent" in actionData &&
          actionData.intent === "remove-password" && (
            <p className="mt-2 text-green-600">
              Password removed successfully!
            </p>
          )}
      </form>
    </>
  );
}
