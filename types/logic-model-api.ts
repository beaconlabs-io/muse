import { z } from "zod";
import { CanvasDataSchema, type CanvasData } from "@/types";

// Contract copy: backend/src/types/logic-model-api.ts が正。リクエストのスキーマは逐語コピー。
// レスポンスの型は backend のポート（application/ports/logic-model-repository.ts）の wire 形
// （Date は ISO 文字列、shareLinkToken は含まず linkEnabled）を手書きする（spec §3.1）。

export const LogicModelTitleSchema = z.string().trim().min(1).max(200);
export const WorkspaceAccessSchema = z.enum(["none", "viewer", "editor"]);
export const ShareRoleSchema = z.enum(["viewer", "editor"]);

export const CreateLogicModelRequestSchema = z.object({
  title: LogicModelTitleSchema.optional(),
  canvasData: CanvasDataSchema.optional(),
});
export type CreateLogicModelRequest = z.infer<typeof CreateLogicModelRequestSchema>;

export const SaveVersionRequestSchema = z.object({
  canvasData: CanvasDataSchema,
});
export type SaveVersionRequest = z.infer<typeof SaveVersionRequestSchema>;

export const UpdateSettingsRequestSchema = z
  .object({
    title: LogicModelTitleSchema.optional(),
    workspaceAccess: WorkspaceAccessSchema.optional(),
    linkEnabled: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "empty patch");
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;

export const PutShareRequestSchema = z.object({
  role: ShareRoleSchema,
});
export type PutShareRequest = z.infer<typeof PutShareRequestSchema>;

export const DEFAULT_LOGIC_MODEL_TITLE = "Untitled";

export type WorkspaceAccess = z.infer<typeof WorkspaceAccessSchema>;
export type ShareRole = z.infer<typeof ShareRoleSchema>;
/** 実効権限（backend の domain/logic-model/access.ts と同じ値） */
export type Access = "none" | "viewer" | "editor" | "owner";

export interface LogicModelListItem {
  id: string;
  title: string;
  ownerId: string;
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
  updatedAt: string;
}

export interface VersionContent {
  versionNo: number;
  canvasData: CanvasData;
}

export interface LogicModelDetail {
  model: {
    id: string;
    organizationId: string;
    ownerId: string;
    title: string;
    workspaceAccess: WorkspaceAccess;
    linkEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  latest: VersionContent | null;
  access: Access;
}

export interface VersionMeta {
  versionNo: number;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface ShareEntry {
  userId: string;
  name: string;
  role: ShareRole;
}

export interface SharedLogicModel {
  title: string;
  latest: VersionContent | null;
}
