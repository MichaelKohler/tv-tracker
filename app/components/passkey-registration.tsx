import { useState, useRef, type FormEvent } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useActionData, useRevalidator } from "react-router";

import type { action } from "../routes/account";

interface PasskeyRegistrationProps {
  isEnabled: boolean;
}

export function PasskeyRegistration({ isEnabled }: PasskeyRegistrationProps) {
  const actionData = useActionData<typeof action>();
  const revalidator = useRevalidator();
  const [showPasskeyForm, setShowPasskeyForm] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  const passkeyNameRef = useRef<HTMLInputElement>(null);

  async function handleRegisterPasskey(e: FormEvent) {
    e.preventDefault();

    if (!passkeyName.trim()) {
      setPasskeyError("Please enter a name for your passkey");
      passkeyNameRef.current?.focus();
      return;
    }

    setIsRegistering(true);
    setPasskeyError(null);

    try {
      const optionsResponse = await fetch("/passkey/register-options");

      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();

      const credential = await startRegistration(options);

      const verifyResponse = await fetch("/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, name: passkeyName.trim() }),
      });

      const result = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(result.error || "Registration failed");
      }

      setPasskeySuccess(true);
      setPasskeyName("");
      setShowPasskeyForm(false);
      revalidator.revalidate();
    } catch (error) {
      const errorMessages: Record<string, string> = {
        NotAllowedError: "Registration canceled or timed out",
        InvalidStateError: "This passkey is already registered",
        NotSupportedError: "Your browser doesn't support passkeys",
        AbortError: "Registration was canceled",
      };

      setPasskeyError(
        error instanceof Error && error.name in errorMessages
          ? errorMessages[error.name]
          : error instanceof Error
            ? error.message
            : "Failed to register passkey. Please try again."
      );
    } finally {
      setIsRegistering(false);
    }
  }

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <hr className="my-8" />

      <h2 className="text-xl font-bold">Security Keys & Passkeys</h2>
      <p className="my-4">
        Add a passkey or security key for faster, more secure login. Passkeys
        use your device&apos;s biometrics or PIN.
      </p>

      {!showPasskeyForm ? (
        <button
          type="button"
          onClick={() => {
            setShowPasskeyForm(true);
            setPasskeyError(null);
            setPasskeySuccess(false);
          }}
          className="w-full rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary"
        >
          Add Passkey
        </button>
      ) : (
        <form onSubmit={handleRegisterPasskey} className="my-4">
          <div>
            <label
              htmlFor="passkeyName"
              className="block text-sm font-medium text-mk-text"
            >
              Passkey Name
            </label>
            <div className="mt-1">
              <input
                id="passkeyName"
                ref={passkeyNameRef}
                type="text"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder="e.g., My iPhone, YubiKey 5"
                disabled={isRegistering}
                aria-invalid={passkeyError ? true : undefined}
                aria-describedby="passkey-name-error"
                className="w-full rounded border border-mk-text px-2 py-1 text-lg"
              />
              {passkeyError && (
                <p className="pt-1 text-mkerror" id="passkey-name-error">
                  {passkeyError}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isRegistering}
              className="flex-1 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary focus:bg-mk-tertiary disabled:opacity-50"
            >
              {isRegistering ? "Registering..." : "Register Passkey"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasskeyForm(false);
                setPasskeyName("");
                setPasskeyError(null);
              }}
              disabled={isRegistering}
              className="rounded border border-mk-text px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {passkeySuccess && (
        <p className="mt-2 text-green-600">Passkey registered successfully!</p>
      )}

      {actionData?.errors?.passkey && (
        <p className="mt-2 text-mkerror">{actionData.errors.passkey}</p>
      )}
    </>
  );
}
