export function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "-";

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}
