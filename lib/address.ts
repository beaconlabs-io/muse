export function shortAddr(address: string, num: number) {
  return address.slice(0, num) + "..." + address.slice(-num);
}