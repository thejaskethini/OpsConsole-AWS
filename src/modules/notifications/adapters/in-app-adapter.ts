/**
 * In-App Channel Adapter (Simulated Local-First)
 */

import type {
  NotificationAdapterPayload,
  NotificationAdapterResult,
  NotificationChannelAdapter,
} from "./types";

export class InAppAdapter implements NotificationChannelAdapter {
  readonly channelType = "IN_APP";
  readonly adapterName = "InAppNotificationAdapter";

  async send(payload: NotificationAdapterPayload): Promise<NotificationAdapterResult> {
    const now = new Date().toISOString();
    const shouldFail =
      payload.destination.toLowerCase().includes("fail") ||
      Boolean(payload.notification.metadata?.forceFailInApp);

    if (shouldFail) {
      return {
        status: "FAILED",
        attemptNumber: payload.attemptNumber,
        timestamp: now,
        adapter: this.adapterName,
        channelType: this.channelType,
        destination: payload.destination,
        error: "Simulated In-App dispatch failed: Client socket disconnected or store buffer full.",
        metadata: {
          simulated: true,
          mode: "LOCAL_SIMULATED",
          deliveredToUiFeed: false,
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
        renderedBadge: payload.notification.severity,
        renderedTitle: payload.notification.title,
        deliveredToUiFeed: true,
      },
    };
  }
}
