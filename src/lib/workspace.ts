"use client";

export interface SharedWorkspace {
  id: string;
  name: string;
  prompt: string;
  attachments: unknown[];
  pipeline: Record<string, unknown>;
  evaluation: Record<string, unknown>;
  mlResult: Record<string, unknown>;
  approvals: unknown[];
  createdAt: string;
  updatedAt: string;
}

const WORKSPACE_KEY = "promptwall_active_workspace";
const WORKSPACE_EVENT = "promptwall:workspace-updated";

export function getWorkspaceId(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(WORKSPACE_KEY);
}

export function broadcastWorkspace(workspace: SharedWorkspace): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKSPACE_KEY, workspace.id);
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: workspace }));
}

export function subscribeWorkspace(listener: (workspace: SharedWorkspace) => void): () => void {
  const handle = (event: Event) => listener((event as CustomEvent<SharedWorkspace>).detail);
  window.addEventListener(WORKSPACE_EVENT, handle);
  return () => window.removeEventListener(WORKSPACE_EVENT, handle);
}

export async function loadWorkspace(): Promise<SharedWorkspace> {
  const id = getWorkspaceId();
  const response = await fetch(`/api/workspace${id ? `?id=${encodeURIComponent(id)}` : ""}`, {
    cache: "no-store",
  });
  if (response.ok) {
    const data = await response.json();
    broadcastWorkspace(data.workspace);
    return data.workspace;
  }
  const createResponse = await fetch("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!createResponse.ok) throw new Error("Workspace could not be created");
  const data = await createResponse.json();
  broadcastWorkspace(data.workspace);
  return data.workspace;
}

export async function updateWorkspace(
  patch: Partial<Omit<SharedWorkspace, "id" | "createdAt" | "updatedAt">>
): Promise<SharedWorkspace> {
  const workspace = await loadWorkspace();
  const response = await fetch("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...workspace, ...patch, id: workspace.id }),
  });
  if (!response.ok) throw new Error("Workspace could not be saved");
  const data = await response.json();
  broadcastWorkspace(data.workspace);
  return data.workspace;
}
