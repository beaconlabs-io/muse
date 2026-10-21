import { z } from "zod";

// Contract copy: backend/src/types/workspace-api.ts が正。逐語コピー。

export const SetPrivateModeRequestSchema = z.object({
  enabled: z.boolean(),
});
export type SetPrivateModeRequest = z.infer<typeof SetPrivateModeRequestSchema>;
