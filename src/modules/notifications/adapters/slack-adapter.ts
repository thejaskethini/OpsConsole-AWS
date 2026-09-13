/**
 * Slack Channel Adapter (Simulated Local-First)
 */

import type {
  NotificationAdapterPayload,
  NotificationAdapterResult,
  NotificationChannelAdapter,
} from "./types";

export class SlackAdapter implements NotificationChannelAdapter {
  readonly channelType = "SLACK";
  readonly adapterName = "SlackNotificationAdapter";

  async send(payload: NotificationAdapterPayload): Promise<NotificationAdapterResult> {
    const now = new Date().toISOString();
    const shouldFail =
      payload.destination.toLowerCase().includes("fail") ||
      Boolean(payload.notification.metadata?.forceFailSlack);

    if (shouldFail) {
      return {
        status: "FAILED",
        attemptNumber: payload.attemptNumber,
        timestamp: now,
        adapter: this.adapterName,
        channelType: this.channelType,
        destination: payload.destination,
        error: "Simulated Slack dispatch failed: channel_not_found or webhook endpoint rejected payload.",
        metadata: {
          simulated: true,
          mode: "LOCAL_SIMULATED",
          slackError: "channel_not_found",
          targetChannel: payload.destination,
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
        targetChannel: payload.destination,
        messageTs: `${Date.now() / 1000}.000100`,
        blocksRendered: true,
        color:
          payload.notification.severity === "SEV1"
            ? "#F43F5E"
            : payload.notification.severity === "SEV2"
            ? "#F59E0B"
            : "#3B82F6",
      },
    };
  }
}
