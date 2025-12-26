interface PlexWebhookProps {
  isEnabled: boolean;
  webhookUrl: string | null;
}

export function PlexWebhook({ isEnabled, webhookUrl }: PlexWebhookProps) {
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

      <p>
        <a href={webhookUrl}>{webhookUrl}</a>
      </p>
    </>
  );
}
