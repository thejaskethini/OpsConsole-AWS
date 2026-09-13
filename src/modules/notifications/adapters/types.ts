/**
 * Channel Adapter Contract & Types
 *
 * Defines the contract that all notification channel adapters must fulfill.
 * Local/simulated adapters provide realistic execution without external credentials.
 */

import type {
  Notification,
  NotificationChannelType,
  NotificationDeliveryStatus,
} from "../types";

export interface NotificationAdapterPayload {
  notification: Notification;
  destination: string;
  attemptNumber: number;
}

export interface NotificationAdapterResult {
  status: NotificationDeliveryStatus;
  attemptNumber: number;
  timestamp: string; // ISO 8601
  adapter: string;
  channelType: NotificationChannelType;
  destination: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannelAdapter {
  readonly channelType: NotificationChannelType;
  readonly adapterName: string;
  send(payload: NotificationAdapterPayload): Promise<NotificationAdapterResult>;
}
