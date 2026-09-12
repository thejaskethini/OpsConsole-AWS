/**
 * SRE Module Entrypoint
 *
 * Exports all SRE domain types, calculation utilities, and repository factory.
 */

import type { SRERepository } from "./repository";
import { LocalSRERepository } from "./local-store";

export * from "./types";
export * from "./burn-rate";
export * from "./error-budget";
export * from "./health";
export * from "./repository";
export * from "./local-store";

let instance: SRERepository | null = null;

/**
 * Returns the active SRERepository singleton instance.
 */
export function getSRERepository(): SRERepository {
  if (!instance) {
    instance = new LocalSRERepository();
  }
  return instance;
}
