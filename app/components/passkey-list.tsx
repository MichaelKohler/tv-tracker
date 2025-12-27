import { useEffect, useState } from "react";
import { Form, useActionData } from "react-router";

import type { action } from "../routes/account";

interface Passkey {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date;
}

interface PasskeyListProps {
  passkeys: Passkey[];
}

export function PasskeyList({ passkeys }: PasskeyListProps) {
  const actionData = useActionData<typeof action>();
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState("");

  useEffect(() => {
    if (actionData?.done && !actionData.errors.passkey) {
      setEditingPasskeyId(null);
      setEditingPasskeyName("");
    }
  }, [actionData]);

  if (!passkeys || passkeys.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Your Passkeys</h3>
      <div className="space-y-4">
        {passkeys.map((passkey) => (
          <div
            key={passkey.id}
            className="border border-mk-text rounded p-4"
          >
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
                        setEditingPasskeyId(passkey.id);
                        setEditingPasskeyName(passkey.name);
                      }}
                      className="rounded border border-mk-text px-3 py-1 text-sm hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <Form method="post" className="inline">
                      <input
                        type="hidden"
                        name="intent"
                        value="delete-passkey"
                      />
                      <input
                        type="hidden"
                        name="passkeyId"
                        value={passkey.id}
                      />
                      <button
                        type="submit"
                        onClick={(e) => {
                          if (
                            !confirm(
                              `Are you sure you want to delete "${passkey.name}"?`
                            )
                          ) {
                            e.preventDefault();
                          }
                        }}
                        className="rounded border border-red-600 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </Form>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Created: {new Date(passkey.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Last used:{" "}
                  {new Date(passkey.lastUsedAt).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
