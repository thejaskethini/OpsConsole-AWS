/**
 * Email Channel Adapter (Simulated Local-First)
 */

import type {
  NotificationAdapterPayload,
  NotificationAdapterResult,
  NotificationChannelAdapter,
} from "./types";

export class EmailAdapter implements NotificationChannelAdapter {
  readonly channelType = "EMAIL";
  readonly adapterName = "EmailNotificationAdapter";

  async send(payload: NotificationAdapterPayload): Promise<NotificationAdapterResult> {
    const now = new Date().toISOString();
    const shouldFail =
      payload.destination.toLowerCase().includes("fail") ||
      !payload.destination.includes("@") ||
      Boolean(payload.notification.metadata?.forceFailEmail);

    if (shouldFail) {
      return {
        status: "FAILED",
        attemptNumber: payload.attemptNumber,
        timestamp: now,
        adapter: this.adapterName,
        channelType: this.channelType,
        destination: payload.destination,
        error: "Simulated Email delivery failed: SMTP 550 Recipient mailbox not found or relay denied.",
        metadata: {
          simulated: true,
          mode: "LOCAL_SIMULATED",
          smtpCode: 550,
          recipient: payload.destination,
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
        recipient: payload.destination,
        sender: "ops-alerts@opsconsole.internal",
        subject: `[${payload.notification.severity}] ${payload.notification.title}`,
        messageId: `<sim-${Date.now()}@opsconsole.internal>`,
      },
    };
  }
}
