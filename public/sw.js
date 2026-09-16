self.addEventListener("push", (event) => {
  let data = { title: "Kinerja", body: "Ada tugas baru.", url: "/board" };
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) };
  } catch {
    const text = event.data ? event.data.text() : "";
    if (text) data.body = text;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/board" },
      tag: data.url || "kinerja-task",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/board";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target);
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
