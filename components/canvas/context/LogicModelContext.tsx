"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { CanvasState } from "@/lib/canvas/storage";
import type { Access, LogicModelDetail, WorkspaceAccess } from "@/types/logic-model-api";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { clearCanvasDraft, draftKey } from "@/lib/canvas/storage";
import { MAX_CANVAS_SIZE } from "@/lib/constants";
import {
  ApiError,
  createLogicModel,
  saveLogicModelVersion,
  updateLogicModelSettings,
} from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";

/** 文書としてのロジックモデル。id が null なら未保存（/canvas） */
export interface LogicModelDocument {
  id: string | null;
  title: string;
  access: Access;
  /** モデルの属するワークスペース。共有ダイアログのメンバー一覧と privateMode はこれで引く（dig Q1）。未保存は null */
  organizationId: string | null;
  /** 共有ダイアログ（Task 9）の初期値。GET /:id の model から写す */
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
}

export interface LogicModelContextValue {
  id: string | null;
  title: string;
  access: Access;
  organizationId: string | null;
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
  readOnly: boolean;
  saving: boolean;
  /** 初回は POST、以後は PUT .../versions。成功したら onSaved を呼ぶ（spec §4.2） */
  save: (snapshot: CanvasState, onSaved: () => void) => Promise<void>;
  rename: (title: string) => Promise<void>;
}

const LogicModelContext = createContext<LogicModelContextValue | undefined>(undefined);

const VIEWER_ONLY: LogicModelDocument = {
  id: null,
  title: "",
  access: "viewer",
  organizationId: null,
  workspaceAccess: "none",
  linkEnabled: false,
};

export function LogicModelProvider({
  document = VIEWER_ONLY,
  children,
}: {
  document?: LogicModelDocument;
  children: ReactNode;
}) {
  const t = useTranslations("logicModel");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [id, setId] = useState(document.id);
  const [title, setTitle] = useState(document.title);
  const [saving, setSaving] = useState(false);
  const readOnly = document.access === "viewer" || document.access === "none";

  const save = useCallback(
    async (snapshot: CanvasState, onSaved: () => void) => {
      const canvasData = { id: id ?? crypto.randomUUID(), ...snapshot };
      if (JSON.stringify(canvasData).length > MAX_CANVAS_SIZE) {
        toast.error(t("tooLarge"));
        return;
      }
      setSaving(true);
      try {
        if (id === null) {
          const created = await createLogicModel({ title, canvasData });
          setId(created.id);
          onSaved();
          clearCanvasDraft(draftKey(null));
          // /canvas/<id> へ replace したときのスピナーを消すため、GET /:id 相当をシードする
          // （dig 2026-09-15 Q2）。organizationId と ownerId はセッションから写す
          const now = new Date().toISOString();
          // Task 7 で organizationClient() を足すと activeOrganizationId が型に載るので、このキャストは消す
          const activeOrganizationId = (
            session?.session as { activeOrganizationId?: string | null } | undefined
          )?.activeOrganizationId;
          queryClient.setQueryData<LogicModelDetail>(logicModelKeys.detail(created.id), {
            model: {
              id: created.id,
              organizationId: activeOrganizationId ?? "",
              ownerId: session?.user.id ?? "",
              title,
              workspaceAccess: "none",
              linkEnabled: false,
              createdAt: now,
              updatedAt: now,
            },
            latest: { versionNo: 1, canvasData },
            access: "owner",
          });
          await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
          router.replace(`/canvas/${created.id}`);
        } else {
          await saveLogicModelVersion(id, canvasData);
          onSaved();
          await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
          await queryClient.invalidateQueries({ queryKey: logicModelKeys.versions(id) });
        }
        toast.success(t("saved"));
      } catch (error) {
        toast.error(
          error instanceof ApiError && error.status === 403 ? t("forbidden") : t("saveFailed"),
        );
      } finally {
        setSaving(false);
      }
    },
    [id, title, t, router, queryClient, session],
  );

  const rename = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (!trimmed || trimmed === title) return;
      const previous = title;
      setTitle(trimmed);
      if (id === null) return;
      try {
        await updateLogicModelSettings(id, { title: trimmed });
        await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
        await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
      } catch {
        setTitle(previous);
        toast.error(t("renameFailed"));
      }
    },
    [id, title, t, queryClient],
  );

  const value = useMemo(
    () => ({
      id,
      title,
      access: document.access,
      organizationId: document.organizationId,
      workspaceAccess: document.workspaceAccess,
      linkEnabled: document.linkEnabled,
      readOnly,
      saving,
      save,
      rename,
    }),
    [id, title, document, readOnly, saving, save, rename],
  );

  return <LogicModelContext.Provider value={value}>{children}</LogicModelContext.Provider>;
}

export function useLogicModel(): LogicModelContextValue {
  const context = useContext(LogicModelContext);
  if (!context) throw new Error("useLogicModel must be used within LogicModelProvider");
  return context;
}
