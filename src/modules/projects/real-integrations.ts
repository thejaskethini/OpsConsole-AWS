import { randomBytes } from "crypto";
import type { ExternalWorkItem, IntegrationStatus } from "./types";
import type { IntegrationProvider } from "./integrations";

export type ProviderKind = "JIRA" | "ASANA";
export type Scope = { userId: string; workspaceId: string; environmentId: string };
export type Credential = { accessToken: string; refreshToken?: string; expiresAt?: number; metadata?: Record<string, string> };
export type ProviderResource = { id: string; name: string; url?: string };
export type SelectedResources = { cloudId?: string; siteName?: string; siteUrl?: string; projectId?: string; projectName?: string; issueTypeId?: string; issueTypeName?: string; workspaceId?: string; workspaceName?: string };

/** Development-only process memory implementation. Production must replace this with encrypted durable secret storage. */
export interface IntegrationCredentialStore { getCredential(scope: Scope, provider: ProviderKind): Promise<Credential | null>; saveCredential(scope: Scope, provider: ProviderKind, credential: Credential): Promise<void>; deleteCredential(scope: Scope, provider: ProviderKind): Promise<void>; }
export class MemoryCredentialStore implements IntegrationCredentialStore {
  private values = new Map<string, Credential>();
  private key(s: Scope, p: ProviderKind) { return `${s.userId}:${s.workspaceId}:${s.environmentId}:${p}`; }
  async getCredential(s: Scope, p: ProviderKind) { const value = this.values.get(this.key(s, p)); return value ? { ...value, metadata: { ...value.metadata } } : null; }
  async saveCredential(s: Scope, p: ProviderKind, c: Credential) { this.values.set(this.key(s, p), { ...c, metadata: { ...c.metadata } }); }
  async deleteCredential(s: Scope, p: ProviderKind) { this.values.delete(this.key(s, p)); }
}
const credentialStore = new MemoryCredentialStore();
export function getCredentialStore(): IntegrationCredentialStore { return credentialStore; }
export async function getSelectedResources(scope: Scope, provider: ProviderKind, store: IntegrationCredentialStore = credentialStore): Promise<SelectedResources> {
  const metadata = (await store.getCredential(scope, provider))?.metadata || {};
  return provider === "JIRA" ? { cloudId: metadata.cloudId, siteName: metadata.siteName, siteUrl: metadata.siteUrl, projectId: metadata.projectId, projectName: metadata.projectName, issueTypeId: metadata.issueTypeId, issueTypeName: metadata.issueTypeName } : { workspaceId: metadata.workspaceId, workspaceName: metadata.workspaceName, projectId: metadata.projectId, projectName: metadata.projectName };
}
export async function persistSelectedResources(scope: Scope, provider: ProviderKind, selected: SelectedResources, store: IntegrationCredentialStore = credentialStore): Promise<SelectedResources> {
  const credential = await store.getCredential(scope, provider);
  if (!credential) throw new ProviderError("AUTH_REQUIRED", 401, "Connect this provider before selecting resources.");
  const allowed = provider === "JIRA"
    ? { cloudId: selected.cloudId, siteName: selected.siteName, siteUrl: selected.siteUrl, projectId: selected.projectId, projectName: selected.projectName, issueTypeId: selected.issueTypeId, issueTypeName: selected.issueTypeName }
    : { workspaceId: selected.workspaceId, workspaceName: selected.workspaceName, projectId: selected.projectId, projectName: selected.projectName };
  const defined = Object.fromEntries(Object.entries(allowed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  await store.saveCredential(scope, provider, { ...credential, metadata: { ...credential.metadata, ...defined } });
  return getSelectedResources(scope, provider, store);
}

export class ProviderError extends Error {
  constructor(public code: "AUTH_REQUIRED" | "TOKEN_EXPIRED" | "TOKEN_REFRESH_FAILED" | "INSUFFICIENT_PERMISSION" | "PROJECT_NOT_FOUND" | "INVALID_REQUEST" | "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "NOT_CONFIGURED", public status = 500, message?: string) { super(message || code); }
}
function providerError(response: Response, fallback: string): ProviderError {
  if (response.status === 401) return new ProviderError("AUTH_REQUIRED", 401, "The provider authorization is no longer valid. Reconnect the integration.");
  if (response.status === 403) return new ProviderError("INSUFFICIENT_PERMISSION", 403, "The authorized account does not have permission for this operation.");
  if (response.status === 404) return new ProviderError("PROJECT_NOT_FOUND", 404, "The selected provider resource was not found or is no longer accessible.");
  if (response.status === 429) return new ProviderError("RATE_LIMITED", 429, "The provider rate limit was reached. Try again shortly.");
  if (response.status >= 500) return new ProviderError("PROVIDER_UNAVAILABLE", 502, `${fallback} is temporarily unavailable.`);
  return new ProviderError("INVALID_REQUEST", response.status, "The provider rejected the requested fields.");
}
abstract class RealProvider implements IntegrationProvider {
  abstract provider: ProviderKind; abstract name: string;
  isSimulated = false;
  constructor(protected scope: Scope, protected store: IntegrationCredentialStore = credentialStore) {}
  abstract configured(): boolean;
  async getStatus(): Promise<IntegrationStatus> { if (!this.configured()) return { provider: this.provider, name: this.name, status: "UNAVAILABLE", isSimulated: false }; const credential = await this.store.getCredential(this.scope, this.provider); return { provider: this.provider, name: this.name, status: credential ? "CONNECTED" : "DISCONNECTED", isSimulated: false, lastSyncAt: credential ? new Date().toISOString() : undefined, metadata: credential?.metadata }; }
  protected async token(): Promise<string> { const c = await this.store.getCredential(this.scope, this.provider); if (!c) throw new ProviderError("AUTH_REQUIRED", 401, "Connect this provider before creating external work."); if (!c.expiresAt || c.expiresAt > Date.now() + 30_000) return c.accessToken; if (!c.refreshToken) throw new ProviderError("TOKEN_EXPIRED", 401, "The provider session expired. Reconnect the integration."); await this.refresh(c); const fresh = await this.store.getCredential(this.scope, this.provider); if (!fresh) throw new ProviderError("TOKEN_REFRESH_FAILED", 401); return fresh.accessToken; }
  protected abstract refresh(credential: Credential): Promise<void>;
  abstract createWorkItem(input: { title: string; description: string; projectId?: string; incidentId?: string; severity?: string; environment?: string; service?: string; providerProjectId?: string; issueTypeId?: string; priorityId?: string; dueDate?: string; assigneeId?: string }): Promise<ExternalWorkItem>;
}
export class RealJiraProvider extends RealProvider {
  provider = "JIRA" as const; name = "Jira Cloud";
  configured() { return Boolean(process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET && process.env.JIRA_REDIRECT_URI); }
  private async json(path: string, init: RequestInit = {}) { const token = await this.token(); const cloudId = (await this.store.getCredential(this.scope, this.provider))?.metadata?.cloudId; if (!cloudId) throw new ProviderError("INVALID_REQUEST", 400, "Select an authorized Jira site before continuing."); const response = await fetch(`https://api.atlassian.com/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...init.headers } }); if (!response.ok) throw providerError(response, "Jira"); return response.json(); }
  protected async refresh(c: Credential) { const response = await fetch("https://auth.atlassian.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", client_id: process.env.JIRA_CLIENT_ID, client_secret: process.env.JIRA_CLIENT_SECRET, refresh_token: c.refreshToken }) }); if (!response.ok) throw new ProviderError("TOKEN_REFRESH_FAILED", 401, "Jira token refresh failed. Reconnect Jira."); const data = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number }; await this.store.saveCredential(this.scope, this.provider, { ...c, accessToken: data.access_token, refreshToken: data.refresh_token || c.refreshToken, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 }); }
  async discoverSites(): Promise<ProviderResource[]> { const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", { headers: { Authorization: `Bearer ${await this.token()}`, Accept: "application/json" } }); if (!response.ok) throw providerError(response, "Jira"); return (await response.json() as Array<{ id: string; name: string; url: string }>).map(x => ({ id: x.id, name: x.name, url: x.url })); }
  async discoverProjects() { return (await this.json("/project/search")).values.map((x: { id: string; name: string; key: string }) => ({ id: x.id, name: `${x.key} — ${x.name}` })); }
  async discoverIssueTypes(projectId: string) { return (await this.json(`/issue/createmeta/${encodeURIComponent(projectId)}/issuetypes`)).issueTypes.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })); }
  async selectSite(cloudId: string) { const site = (await this.discoverSites()).find(item => item.id === cloudId); if (!site) throw new ProviderError("PROJECT_NOT_FOUND", 404, "The selected Jira site is not accessible to the authorized account."); return persistSelectedResources(this.scope, "JIRA", { cloudId: site.id, siteName: site.name, siteUrl: site.url, projectId: "", projectName: "", issueTypeId: "", issueTypeName: "" }, this.store); }
  async selectProject(projectId: string) { const project = (await this.discoverProjects()).find((item: ProviderResource) => item.id === projectId); if (!project) throw new ProviderError("PROJECT_NOT_FOUND", 404, "The selected Jira project is not accessible to the authorized account."); return persistSelectedResources(this.scope, "JIRA", { projectId: project.id, projectName: project.name, issueTypeId: "", issueTypeName: "" }, this.store); }
  async selectIssueType(projectId: string, issueTypeId: string) { const issueType = (await this.discoverIssueTypes(projectId)).find((item: ProviderResource) => item.id === issueTypeId); if (!issueType) throw new ProviderError("PROJECT_NOT_FOUND", 404, "The selected Jira issue type is not available for this project."); return persistSelectedResources(this.scope, "JIRA", { issueTypeId: issueType.id, issueTypeName: issueType.name }, this.store); }
  async createWorkItem(input: Parameters<IntegrationProvider["createWorkItem"]>[0] & { providerProjectId?: string; issueTypeId?: string; priorityId?: string }): Promise<ExternalWorkItem> { if (!input.providerProjectId || !input.issueTypeId) throw new ProviderError("INVALID_REQUEST", 400, "A Jira project and issue type are required."); const fields: Record<string, unknown> = { project: { id: input.providerProjectId }, issuetype: { id: input.issueTypeId }, summary: input.title, description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: input.description }] }] } }; if (input.priorityId) fields.priority = { id: input.priorityId }; const issue = await this.json("/issue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }) as { id: string; key: string; self?: string }; const site = (await this.store.getCredential(this.scope, this.provider))?.metadata?.siteUrl; return { id: issue.id, externalId: issue.key, provider: "JIRA", title: input.title, description: input.description, status: "OPEN", url: site ? `${site}/browse/${issue.key}` : issue.self, isSimulated: false, createdAt: new Date().toISOString() }; }
  async updateIssue(issueId: string, fields: Record<string, unknown>) { await this.json(`/issue/${encodeURIComponent(issueId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }); }
}
export class RealAsanaProvider extends RealProvider {
  provider = "ASANA" as const; name = "Asana";
  configured() { return Boolean(process.env.ASANA_CLIENT_ID && process.env.ASANA_CLIENT_SECRET && process.env.ASANA_REDIRECT_URI); }
  protected async refresh(c: Credential) { const body = new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.ASANA_CLIENT_ID!, client_secret: process.env.ASANA_CLIENT_SECRET!, refresh_token: c.refreshToken! }); const response = await fetch("https://app.asana.com/-/oauth_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }); if (!response.ok) throw new ProviderError("TOKEN_REFRESH_FAILED", 401, "Asana token refresh failed. Reconnect Asana."); const data = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number }; await this.store.saveCredential(this.scope, this.provider, { ...c, accessToken: data.access_token, refreshToken: data.refresh_token || c.refreshToken, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 }); }
  private async request(path: string, init: RequestInit = {}) { const response = await fetch(`https://app.asana.com/api/1.0${path}`, { ...init, headers: { Authorization: `Bearer ${await this.token()}`, Accept: "application/json", ...init.headers } }); if (!response.ok) throw providerError(response, "Asana"); return response.json() as Promise<{ data: unknown }>; }
  async discoverWorkspaces() { return (await this.request("/workspaces")).data as ProviderResource[]; }
  async discoverProjects(workspaceId: string) { return (await this.request(`/workspaces/${encodeURIComponent(workspaceId)}/projects`)).data as ProviderResource[]; }
  async selectWorkspace(workspaceId: string) { const workspace = (await this.discoverWorkspaces()).find(item => item.id === workspaceId); if (!workspace) throw new ProviderError("PROJECT_NOT_FOUND", 404, "The selected Asana workspace is not accessible to the authorized account."); return persistSelectedResources(this.scope, "ASANA", { workspaceId: workspace.id, workspaceName: workspace.name, projectId: "", projectName: "" }, this.store); }
  async selectProject(workspaceId: string, projectId: string) { const project = (await this.discoverProjects(workspaceId)).find(item => item.id === projectId); if (!project) throw new ProviderError("PROJECT_NOT_FOUND", 404, "The selected Asana project is not accessible to the authorized account."); return persistSelectedResources(this.scope, "ASANA", { projectId: project.id, projectName: project.name }, this.store); }
  async createWorkItem(input: Parameters<IntegrationProvider["createWorkItem"]>[0] & { providerProjectId?: string; workspaceId?: string; assigneeId?: string; dueDate?: string }): Promise<ExternalWorkItem> { if (!input.providerProjectId || !input.workspaceId) throw new ProviderError("INVALID_REQUEST", 400, "An Asana workspace and project are required."); const data = await this.request("/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { name: input.title, notes: input.description, workspace: input.workspaceId, projects: [input.providerProjectId], ...(input.assigneeId ? { assignee: input.assigneeId } : {}), ...(input.dueDate ? { due_on: input.dueDate } : {}) } }) }) as { data: { gid: string; permalink_url?: string } }; return { id: data.data.gid, externalId: data.data.gid, provider: "ASANA", title: input.title, description: input.description, status: "OPEN", url: data.data.permalink_url, isSimulated: false, createdAt: new Date().toISOString() }; }
  async updateTask(taskId: string, changes: Record<string, unknown>) { await this.request(`/tasks/${encodeURIComponent(taskId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: changes }) }); }
}
export function createRealProvider(provider: ProviderKind, scope: Scope) { return provider === "JIRA" ? new RealJiraProvider(scope) : new RealAsanaProvider(scope); }
export function oauthState() { return randomBytes(32).toString("base64url"); }
const pendingStates = new Map<string, { scope: Scope; provider: ProviderKind; verifier?: string; expiresAt: number }>();
export function saveOAuthState(state: string, scope: Scope, provider: ProviderKind, verifier?: string) { pendingStates.set(state, { scope, provider, verifier, expiresAt: Date.now() + 10 * 60_000 }); }
export function consumeOAuthState(state: string, provider: ProviderKind) { const record = pendingStates.get(state); pendingStates.delete(state); return record && record.provider === provider && record.expiresAt > Date.now() ? record : null; }
export async function exchangeOAuthCode(provider: ProviderKind, scope: Scope, code: string, verifier?: string) {
  const jira = provider === "JIRA";
  const body = jira ? JSON.stringify({ grant_type: "authorization_code", client_id: process.env.JIRA_CLIENT_ID, client_secret: process.env.JIRA_CLIENT_SECRET, code, redirect_uri: process.env.JIRA_REDIRECT_URI }) : new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.ASANA_CLIENT_ID!, client_secret: process.env.ASANA_CLIENT_SECRET!, code, redirect_uri: process.env.ASANA_REDIRECT_URI!, ...(verifier ? { code_verifier: verifier } : {}) });
  const response = await fetch(jira ? "https://auth.atlassian.com/oauth/token" : "https://app.asana.com/-/oauth_token", { method: "POST", headers: { "Content-Type": jira ? "application/json" : "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new ProviderError("AUTH_REQUIRED", 401, `${provider === "JIRA" ? "Jira" : "Asana"} authorization could not be completed.`);
  const data = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  await credentialStore.saveCredential(scope, provider, { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 });
}
