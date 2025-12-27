import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, useLoaderData, useSearchParams } from "react-router";

import { DeleteAccount } from "../components/delete-account";
import { PasskeyList } from "../components/passkey-list";
import { PasskeyRegistration } from "../components/passkey-registration";
import { PasswordChangeForm } from "../components/password-change-form";
import { PlexWebhook } from "../components/plex-webhook";
import { evaluateBoolean, FLAGS } from "../flags.server";
import {
  deletePasskey,
  getPasskeysByUserId,
  updatePasskeyName,
} from "../models/passkey.server";
import { changePassword, verifyLogin } from "../models/user.server";
import { requireUser } from "../session.server";
import { getPasswordValidationError } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    // We need to short-curcuit everything and allow the change of password
    return {
      webhookUrl: null,
      passkeys: [],
      features: {
        passwordChange: await evaluateBoolean(request, FLAGS.PASSWORD_CHANGE),
        passkeyRegistration: false,
        deleteAccount: false,
        plex: false,
      },
    };
  }

  const user = await requireUser(request);
  const webhookUrl = url.origin + "/plex/" + user.plexToken;

  const features = {
    passwordChange: await evaluateBoolean(request, FLAGS.PASSWORD_CHANGE),
    passkeyRegistration: await evaluateBoolean(
      request,
      FLAGS.PASSKEY_REGISTRATION
    ),
    deleteAccount: await evaluateBoolean(request, FLAGS.DELETE_ACCOUNT),
    plex: await evaluateBoolean(request, FLAGS.PLEX),
  };

  const passkeys = await getPasskeysByUserId(user.id);

  const sanitizedPasskeys = passkeys.map((passkey) => ({
    id: passkey.id,
    name: passkey.name,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  }));

  return {
    webhookUrl,
    passkeys: sanitizedPasskeys,
    features,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  const errors = {
    password: null,
    newPassword: null,
    confirmPassword: null,
    token: null,
    generic: null,
    passkey: null,
  };

  if (intent === "edit-passkey") {
    const user = await requireUser(request);
    const passkeyId = formData.get("passkeyId");
    const passkeyName = formData.get("passkeyName");

    if (typeof passkeyId !== "string" || !passkeyId) {
      return data(
        { errors: { ...errors, passkey: "Invalid passkey ID" }, done: false },
        { status: 400 }
      );
    }

    if (typeof passkeyName !== "string" || passkeyName.trim() === "") {
      return data(
        {
          errors: { ...errors, passkey: "Passkey name is required" },
          done: false,
        },
        { status: 400 }
      );
    }

    try {
      await updatePasskeyName(passkeyId, user.id, passkeyName.trim());
      return { done: true, errors };
    } catch (_error) {
      return data(
        {
          errors: { ...errors, passkey: "Failed to update passkey name" },
          done: false,
        },
        { status: 500 }
      );
    }
  }

  if (intent === "delete-passkey") {
    const user = await requireUser(request);
    const passkeyId = formData.get("passkeyId");

    if (typeof passkeyId !== "string" || !passkeyId) {
      return data(
        { errors: { ...errors, passkey: "Invalid passkey ID" }, done: false },
        { status: 400 }
      );
    }

    try {
      await deletePasskey(passkeyId, user.id);
      return { done: true, errors };
    } catch (_error) {
      return data(
        {
          errors: { ...errors, passkey: "Failed to delete passkey" },
          done: false,
        },
        { status: 500 }
      );
    }
  }

  const currentPassword = formData.get("password");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");
  const token = formData.get("token") || "";

  if (typeof newPassword !== "string" || newPassword === "") {
    return data(
      {
        errors: { ...errors, newPassword: "New password is required" },
        done: false,
      },
      { status: 400 }
    );
  }

  const passwordError = getPasswordValidationError(newPassword);
  if (passwordError) {
    return data(
      {
        errors: { ...errors, newPassword: passwordError },
        done: false,
      },
      { status: 400 }
    );
  }

  if (typeof confirmPassword !== "string" || confirmPassword === "") {
    return data(
      {
        errors: {
          ...errors,
          confirmPassword: "Password confirmation is required",
        },
        done: false,
      },
      { status: 400 }
    );
  }

  if (confirmPassword !== newPassword) {
    return data(
      {
        errors: { ...errors, confirmPassword: "Passwords do not match" },
        done: false,
      },
      { status: 400 }
    );
  }

  let user = { email: "" };
  if (!token) {
    // We do not want to go further if there is no token and the
    // user is not logged in. This check here is crucial to not allow
    // for password changes without token. We also want to verify
    // the current password before going on.
    user = await requireUser(request);

    if (typeof currentPassword !== "string" || currentPassword === "") {
      return data(
        {
          errors: { ...errors, password: "Current password is required." },
          done: false,
        },
        { status: 400 }
      );
    }

    const isValid = await verifyLogin(user.email, currentPassword);
    if (!isValid) {
      return data(
        {
          errors: { ...errors, password: "Current password is wrong." },
          done: false,
        },
        { status: 400 }
      );
    }
  }

  try {
    await changePassword(user.email, newPassword, token.toString());
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_RESET_EXPIRED") {
      return data(
        {
          errors: {
            ...errors,
            token: "Password reset link expired. Please try again.",
          },
          done: false,
        },
        { status: 400 }
      );
    }

    return data(
      {
        errors: {
          ...errors,
          generic: "Something went wrong. Please try again.",
        },
        done: false,
      },
      { status: 500 }
    );
  }

  return { done: true, errors };
}

export default function AccountPage() {
  const { webhookUrl, passkeys, features } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  return (
    <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
      <PasswordChangeForm
        resetToken={resetToken}
        isEnabled={features.passwordChange}
      />

      <PasskeyRegistration isEnabled={features.passkeyRegistration} />

      <PasskeyList passkeys={passkeys} />

      <PlexWebhook isEnabled={features.plex} webhookUrl={webhookUrl} />

      <DeleteAccount isEnabled={features.deleteAccount} />
    </main>
  );
}
