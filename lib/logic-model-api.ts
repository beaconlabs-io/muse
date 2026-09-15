import type { CanvasData } from "@/types";
import type {
  LogicModelDetail,
  LogicModelListItem,
  ShareEntry,
  ShareRole,
  SharedLogicModel,
  UpdateSettingsRequest,
  VersionContent,
  VersionMeta,
} from "@/types/logic-model-api";
import { apiUrl } from "@/lib/api-client";

/** backend spec §6.3 の 400/401/403/404 を呼び出し側が出し分けるための例外 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    // Better Auth のセッション Cookie を backend のホストへ運ぶ（spec §3.2）
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function json(method: "POST" | "PUT" | "PATCH", body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function listLogicModels(): Promise<LogicModelListItem[]> {
  return request("/api/logic-models");
}

export function createLogicModel(input: {
  title?: string;
  canvasData?: CanvasData;
}): Promise<{ id: string }> {
  return request("/api/logic-models", json("POST", input));
}

export function getLogicModel(id: string): Promise<LogicModelDetail> {
  return request(`/api/logic-models/${encodeURIComponent(id)}`);
}

export function saveLogicModelVersion(
  id: string,
  canvasData: CanvasData,
): Promise<{ versionNo: number }> {
  return request(
    `/api/logic-models/${encodeURIComponent(id)}/versions`,
    json("PUT", { canvasData }),
  );
}

export function listLogicModelVersions(id: string): Promise<VersionMeta[]> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/versions`);
}

export function getLogicModelVersion(id: string, versionNo: number): Promise<VersionContent> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/versions/${versionNo}`);
}

export function restoreLogicModelVersion(
  id: string,
  versionNo: number,
): Promise<{ versionNo: number }> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/versions/${versionNo}/restore`, {
    method: "POST",
  });
}

export function updateLogicModelSettings(
  id: string,
  patch: UpdateSettingsRequest,
): Promise<{ shareLinkToken: string | null }> {
  return request(`/api/logic-models/${encodeURIComponent(id)}`, json("PATCH", patch));
}

export function listLogicModelShares(id: string): Promise<ShareEntry[]> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/shares`);
}

export function putLogicModelShare(id: string, userId: string, role: ShareRole): Promise<void> {
  return request(
    `/api/logic-models/${encodeURIComponent(id)}/shares/${encodeURIComponent(userId)}`,
    json("PUT", { role }),
  );
}

export function deleteLogicModelShare(id: string, userId: string): Promise<void> {
  return request(
    `/api/logic-models/${encodeURIComponent(id)}/shares/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export function deleteLogicModel(id: string): Promise<void> {
  return request(`/api/logic-models/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getSharedLogicModel(token: string): Promise<SharedLogicModel> {
  return request(`/api/shared-logic-models/${encodeURIComponent(token)}`);
}
