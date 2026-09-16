import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:noreply@localhost";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return vapidConfig()?.publicKey ?? null;
}

function configuredWebPush() {
  const config = vapidConfig();
  if (!config) return null;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return webpush;
}

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  const client = configuredWebPush();
  if (!client) return "skipped" as const;

  try {
    await client.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return "sent" as const;
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    if (status === 404 || status === 410) return "gone" as const;
    console.error("Web push failed", error);
    return "failed" as const;
  }
}
