/**
 * Incident Domain Module Entrypoint
 *
 * Exports types, repository singleton, and lifecycle engine.
 */

import { LocalIncidentRepository, type IncidentRepository } from "./repository";
import { IncidentEngine } from "./engine";

export * from "./types";
export * from "./repository";
export * from "./engine";

let repositoryInstance: IncidentRepository | null = null;
let engineInstance: IncidentEngine | null = null;

/**
 * Returns the singleton IncidentRepository instance.
 */
export function getIncidentRepository(): IncidentRepository {
  if (!repositoryInstance) {
    repositoryInstance = new LocalIncidentRepository();
  }
  return repositoryInstance;
}

/**
 * Returns the singleton IncidentEngine instance.
 */
export function getIncidentEngine(): IncidentEngine {
  if (!engineInstance) {
    engineInstance = new IncidentEngine(getIncidentRepository());
  }
  return engineInstance;
}
