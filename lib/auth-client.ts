import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * muse-backend にホストされた Better Auth のクライアント。セッション Cookie は backend の
 * ホストに置かれ、同一サイト（beaconlabs.io）なので既定の credentials: "include" で運ばれる。
 *
 * NEXT_PUBLIC_API_BASE_URL は必須（lib/api-client.ts と同じ）。未設定だと Better Auth は
 * window.location.origin にフォールバックし、/api/auth が無いこのアプリに向けて黙って 404 する。
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  plugins: [
    organizationClient({
      schema: {
        organization: {
          // backend の plugins.ts と同じ。get-full-organization の応答に型を付ける
          additionalFields: { privateMode: { type: "boolean", required: true, input: false } },
        },
      },
    }),
  ],
});
