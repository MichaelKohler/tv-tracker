import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

import type { action } from "../routes/account";

interface Passkey {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date;
}

interface PasskeyListProps {
  passkeys: Passkey[];
  hasPassword: boolean;
}

export function PasskeyList({ passkeys, hasPassword }: PasskeyListProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isDeleting = navigation.formData?.get("intent") === "delete-passkey";
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(
    null
  );
  const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(
    actionData?.errors?.passkey ?? null
  );
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState("");

  useEffect(() => {
    setPasskeyError(actionData?.errors?.passkey ?? null);

    if (actionData?.done && !actionData.errors.passkey) {
      setEditingPasskeyId(null);
      setEditingPasskeyName("");
      setDeletingPasskeyId(null);
    }
  }, [actionData]);

  async function handleDeleteWithPasskey(passkey: Passkey) {
    if (!confirm(`Are you sure you want to delete "${passkey.name}"?`)) {
      return;
    }

    setIsVerifyingPasskey(true);
    setPasskeyError(null);

    try {
      const optionsResponse = await fetch("/passkey/login-options");
      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const options = await optionsResponse.json();
      const credential = await startAuthentication(options);

      const formData = new FormData();
      formData.append("intent", "delete-passkey");
      formData.append("passkeyId", passkey.id);
      formData.append("passkeyCredential", JSON.stringify(credential));

      void submit(formData, { method: "post" });
    } catch (error) {
      console.error("Passkey authentication failed:", error);
      setPasskeyError("Passkey verification failed. Please try again.");
    } finally {
      setIsVerifyingPasskey(false);
    }
  }

  const errorAlert = passkeyError && (
    <p role="alert" className="mb-4 text-mkerror">
      {passkeyError}
    </p>
  );

  if (!passkeys || passkeys.length === 0) {
    return errorAlert ? <div className="mt-8">{errorAlert}</div> : null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Your Passkeys</h3>
      {errorAlert}
      <div className="space-y-4">
        {passkeys.map((passkey) => (
          <div key={passkey.id} className="border border-mk-text rounded p-4">
            {editingPasskeyId === passkey.id ? (
              <Form method="post" className="space-y-2">
                <input type="hidden" name="intent" value="edit-passkey" />
                <input type="hidden" name="passkeyId" value={passkey.id} />
                <div>
                  <label
                    htmlFor={`passkey-name-${passkey.id}`}
                    className="block text-sm font-medium text-mk-text"
                  >
                    Passkey Name
                  </label>
                  <div className="mt-1">
                    <input
                      id={`passkey-name-${passkey.id}`}
                      name="passkeyName"
                      type="text"
                      value={editingPasskeyName}
                      onChange={(e) => setEditingPasskeyName(e.target.value)}
                      className="w-full rounded border border-mk-text px-2 py-1 text-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasskeyError(null);
                      setEditingPasskeyId(null);
                      setEditingPasskeyName("");
                    }}
                    className="rounded border border-mk-text px-4 py-2 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{passkey.name}</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasskeyError(null);
                        setEditingPasskeyId(passkey.id);
                        setEditingPasskeyName(passkey.name);
                      }}
                      className="rounded border border-mk-text px-3 py-1 text-sm hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isVerifyingPasskey || isDeleting}
                      onClick={() => {
                        if (hasPassword) {
                          setPasskeyError(null);
                          setDeletingPasskeyId(passkey.id);
                        } else {
                          void handleDeleteWithPasskey(passkey);
                        }
                      }}
                      className="rounded border border-red-600 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Created: {new Date(passkey.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                </p>
                {deletingPasskeyId === passkey.id && (
                  <Form method="post" className="mt-4 space-y-2">
                    <input type="hidden" name="intent" value="delete-passkey" />
                    <input type="hidden" name="passkeyId" value={passkey.id} />
                    <div>
                      <label
                        htmlFor={`passkey-delete-password-${passkey.id}`}
                        className="block text-sm font-medium text-mk-text"
                      >
                        Confirm with your password
                      </label>
                      <div className="mt-1">
                        <input
                          id={`passkey-delete-password-${passkey.id}`}
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          className="w-full rounded border border-mk-text px-2 py-1 text-lg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className="flex-1 rounded bg-mkerror px-4 py-2 text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
                      >
                        {isDeleting ? "Deleting..." : "Delete passkey"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasskeyError(null);
                          setDeletingPasskeyId(null);
                        }}
                        className="rounded border border-mk-text px-4 py-2 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </Form>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
