import { createAuthClient } from "better-auth/react";

/**
 * muse-backend にホストされた Better Auth のクライアント。セッション Cookie は backend の
 * ホストに置かれ、同一サイト（beaconlabs.io）なので既定の credentials: "include" で運ばれる。
 * organizationClient() は組織 UI が現れるまで足さない。
 *
 * NEXT_PUBLIC_API_BASE_URL は必須（lib/api-client.ts と同じ）。未設定だと Better Auth は
 * window.location.origin にフォールバックし、/api/auth が無いこのアプリに向けて黙って 404 する。
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});
