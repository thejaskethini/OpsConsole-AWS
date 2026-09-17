import type { Project } from "@/modules/projects";

export interface ProjectListResponse {
  workspaceId: string;
  environmentId: string;
  projects: Project[];
  totalCount: number;
  isSimulated: boolean;
}

export async function loadProjectPortfolio(workspaceId: string, environmentId: string): Promise<ProjectListResponse> {
  const params = new URLSearchParams({ workspaceId, environmentId });
  const response = await fetch(`/api/projects?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to load projects");
  if (!Array.isArray(data?.projects)) throw new Error("Invalid project response");
  return data as ProjectListResponse;
}

export function formatProjectDate(value?: string): string {
  return value ? new Date(value).toLocaleDateString() : "Not recorded";
}