import { Form, useActionData, useNavigation } from "react-router";

import type { action } from "../routes/account";

const RESET_PLEX_TOKEN_INTENT = "reset-plex-token";

interface PlexWebhookProps {
  isEnabled: boolean;
  webhookUrl: string | null;
}

export function PlexWebhook({ isEnabled, webhookUrl }: PlexWebhookProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isResetting =
    navigation.formData?.get("intent") === RESET_PLEX_TOKEN_INTENT;
  const error = actionData?.errors?.plexToken;
  const wasReset =
    actionData && "intent" in actionData
      ? actionData.intent === RESET_PLEX_TOKEN_INTENT
      : false;

  if (!isEnabled || !webhookUrl) {
    return null;
  }

  return (
    <>
      <hr className="my-8" />

      <h2 className="text-xl font-bold">Plex Webhook</h2>
      <p className="my-4">
        You can add a webhook to Plex, so that every time an episode is watched
        (&gt; 90% on Plex), it will also be marked as watched here. This link
        does not use authentication, so be careful with it. Others could connect
        their Plex account to this webhook or send random data to it, creating a
        mess.
      </p>

      <Form method="post" className="flex flex-col items-start gap-4">
        <a href={webhookUrl} className="break-all">
          {webhookUrl}
        </a>
        <input type="hidden" name="intent" value={RESET_PLEX_TOKEN_INTENT} />
        <button
          type="submit"
          disabled={isResetting}
          onClick={(e) => {
            if (
              !confirm(
                "Are you sure you want to reset the Plex token? The current webhook URL will stop working."
              )
            ) {
              e.preventDefault();
            }
          }}
          className="w-full rounded bg-mkerror py-2 px-4 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
        >
          {isResetting ? "Resetting..." : "Reset token"}
        </button>
      </Form>

      {error && (
        <p role="alert" className="mt-2 text-mkerror">
          {error}
        </p>
      )}

      {wasReset && !isResetting && (
        <output className="mt-2 block text-green-600">
          Plex token reset. Update the webhook URL in Plex.
        </output>
      )}
    </>
  );
}
