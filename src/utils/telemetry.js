const endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT || "";

export function telemetryEnabled() {
  return Boolean(endpoint);
}

export async function sendTelemetry(event, payload = {}) {
  if (!endpoint) return;
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        payload,
        ts: new Date().toISOString(),
        href: typeof location !== "undefined" ? location.href : null,
      }),
    });
  } catch (e) {
    try {
      console.debug("telemetry send failed", e);
    } catch (e) {}
  }
}

export default { telemetryEnabled, sendTelemetry };
