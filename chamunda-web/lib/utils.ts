export function uid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + crypto.randomUUID();
  return prefix + Math.random().toString(36).slice(2, 10);
}

export function emptyLineItem() {
  return { description: "", hsn: "", unit: "Nos", qty: "", rate: "" };
}
