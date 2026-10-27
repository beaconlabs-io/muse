import type { ReactNode } from "react";

/** 設定ページの定石: 左に見出しと説明、右にコントロールのカード。設定とメンバーの両ページで使う */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 py-10 first:pt-0 last:pb-0 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="bg-card grid gap-5 rounded-xl border p-5">{children}</div>
    </section>
  );
}
