/**
 * Channel Adapters Registry & Factory
 */

import type { NotificationChannelType } from "../types";
import type { NotificationChannelAdapter } from "./types";
import { InAppAdapter } from "./in-app-adapter";
import { WebhookAdapter } from "./webhook-adapter";
import { EmailAdapter } from "./email-adapter";
import { SlackAdapter } from "./slack-adapter";
import { TeamsAdapter } from "./teams-adapter";

export * from "./types";
export * from "./in-app-adapter";
export * from "./webhook-adapter";
export * from "./email-adapter";
export * from "./slack-adapter";
export * from "./teams-adapter";

export class NotificationAdapterRegistry {
  private adapters = new Map<NotificationChannelType, NotificationChannelAdapter>();

  constructor() {
    this.register(new InAppAdapter());
    this.register(new WebhookAdapter());
    this.register(new EmailAdapter());
    this.register(new SlackAdapter());
    this.register(new TeamsAdapter());
  }

  public register(adapter: NotificationChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
  }

  public getAdapter(channelType: NotificationChannelType): NotificationChannelAdapter {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      throw new Error(`No notification adapter registered for channel type '${channelType}'`);
    }
    return adapter;
  }
}

let registryInstance: NotificationAdapterRegistry | null = null;

export function getAdapterRegistry(): NotificationAdapterRegistry {
  if (!registryInstance) {
    registryInstance = new NotificationAdapterRegistry();
  }
  return registryInstance;
}
