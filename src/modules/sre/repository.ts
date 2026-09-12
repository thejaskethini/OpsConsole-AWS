/**
 * SRE Repository Interface
 *
 * Provides the abstraction for retrieving services, golden signals,
 * SLIs, SLOs, and executive reliability metrics.
 */

import type {
  Service,
  GoldenSignals,
  SLI,
  SLO,
  ServiceWithReliability,
  SREExecutiveHealth,
} from "./types";

export interface SRERepository {
  listServices(workspaceId?: string, environmentId?: string): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | null>;
  getServiceBySlug(slug: string): Promise<Service | null>;
  getGoldenSignals(serviceId: string): Promise<GoldenSignals | null>;
  listSLIs(serviceId?: string): Promise<SLI[]>;
  listSLOs(serviceId?: string): Promise<SLO[]>;
  getServiceWithReliability(serviceId: string): Promise<ServiceWithReliability | null>;
  getExecutiveHealth(workspaceId?: string, environmentId?: string): Promise<SREExecutiveHealth>;
}
