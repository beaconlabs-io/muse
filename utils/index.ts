export function formatDate(timestamp: string) {
  const date = new Date(timestamp);

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function shortAddr(address: string, num: number) {
  return address.slice(0, num) + "..." + address.slice(-num);
}
