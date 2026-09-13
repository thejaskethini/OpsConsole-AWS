/**
 * Webhook Channel Adapter (Simulated Local-First)
 */

import type {
  NotificationAdapterPayload,
  NotificationAdapterResult,
  NotificationChannelAdapter,
} from "./types";

export class WebhookAdapter implements NotificationChannelAdapter {
  readonly channelType = "WEBHOOK";
  readonly adapterName = "WebhookNotificationAdapter";

  async send(payload: NotificationAdapterPayload): Promise<NotificationAdapterResult> {
    const now = new Date().toISOString();
    const shouldFail =
      payload.destination.toLowerCase().includes("fail") ||
      payload.destination.toLowerCase().includes("invalid") ||
      Boolean(payload.notification.metadata?.forceFailWebhook);

    if (shouldFail) {
      return {
        status: "FAILED",
        attemptNumber: payload.attemptNumber,
        timestamp: now,
        adapter: this.adapterName,
        channelType: this.channelType,
        destination: payload.destination,
        error: "Simulated Webhook delivery failed: HTTP 503 Service Unavailable / Connection timeout.",
        metadata: {
          simulated: true,
          mode: "LOCAL_SIMULATED",
          httpStatus: 503,
          url: payload.destination,
        },
      };
    }

    return {
      status: "DELIVERED",
      attemptNumber: payload.attemptNumber,
      timestamp: now,
      adapter: this.adapterName,
      channelType: this.channelType,
      destination: payload.destination,
      metadata: {
        simulated: true,
        mode: "LOCAL_SIMULATED",
        httpStatus: 200,
        url: payload.destination,
        headers: {
          "Content-Type": "application/json",
          "X-OpsConsole-Event": payload.notification.eventType,
          "X-OpsConsole-Delivery": "simulated",
        },
        payloadDigest: `SHA256:${payload.notification.id}`,
      },
    };
  }
}
