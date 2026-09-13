/**
 * Microsoft Teams Channel Adapter (Simulated Local-First)
 */

import type {
  NotificationAdapterPayload,
  NotificationAdapterResult,
  NotificationChannelAdapter,
} from "./types";

export class TeamsAdapter implements NotificationChannelAdapter {
  readonly channelType = "TEAMS";
  readonly adapterName = "TeamsNotificationAdapter";

  async send(payload: NotificationAdapterPayload): Promise<NotificationAdapterResult> {
    const now = new Date().toISOString();
    const shouldFail =
      payload.destination.toLowerCase().includes("fail") ||
      Boolean(payload.notification.metadata?.forceFailTeams);

    if (shouldFail) {
      return {
        status: "FAILED",
        attemptNumber: payload.attemptNumber,
        timestamp: now,
        adapter: this.adapterName,
        channelType: this.channelType,
        destination: payload.destination,
        error: "Simulated Teams dispatch failed: ConnectorsWebhookUrlInvalid / HTTP 400 Bad Request.",
        metadata: {
          simulated: true,
          mode: "LOCAL_SIMULATED",
          connectorError: "InvalidWebhookUrl",
          destination: payload.destination,
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
        destination: payload.destination,
        adaptiveCardSchema: "http://adaptivecards.io/schemas/adaptive-card.json",
        renderedTheme:
          payload.notification.severity === "SEV1" ? "attention" : "warning",
      },
    };
  }
}
