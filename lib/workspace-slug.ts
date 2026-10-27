/**
 * backend spec §7.5: 名前を ASCII 化して slug にする。空になる（日本語のみなど）か、
 * 個人用の u- 接頭辞と紛れる場合は ws- + 乱数 8 文字にする。
 */
export function workspaceSlug(name: string, random: () => string = randomHex): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii.length === 0 || ascii.startsWith("u-")) return `ws-${random().slice(0, 8)}`;
  return ascii;
}

/** ORGANIZATION_ALREADY_EXISTS のときの 1 回だけの再試行用 */
export function retrySlug(slug: string, random: () => string = randomHex): string {
  return `${slug}-${random().slice(0, 4)}`;
}

function randomHex(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
