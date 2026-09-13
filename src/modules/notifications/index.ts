/**
 * Notification Domain Module Entrypoint
 *
 * Exports types, adapters, repository singleton, and engine singleton.
 */

import { LocalNotificationRepository, type NotificationRepository } from "./repository";
import { NotificationEngine } from "./engine";

export * from "./types";
export * from "./repository";
export * from "./engine";
export * from "./adapters";
export * from "./local-store";

let repositoryInstance: NotificationRepository | null = null;
let engineInstance: NotificationEngine | null = null;

/**
 * Returns the singleton NotificationRepository instance.
 */
export function getNotificationRepository(): NotificationRepository {
  if (!repositoryInstance) {
    repositoryInstance = new LocalNotificationRepository();
  }
  return repositoryInstance;
}

/**
 * Returns the singleton NotificationEngine instance.
 */
export function getNotificationEngine(): NotificationEngine {
  if (!engineInstance) {
    engineInstance = new NotificationEngine(getNotificationRepository());
  }
  return engineInstance;
}
