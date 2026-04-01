export function enumToOptions<T extends { id: string; name: string; code?: string }>(
  items: T[]
): { value: string; label: string }[] {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

export function getStatusColor(
  items: { code: string; color: string }[],
  code: string,
  fallback = "#6b7280"
): string {
  return items.find((i) => i.code === code)?.color ?? fallback;
}

export function getStatusLabel(
  items: { code: string; name: string }[],
  code: string,
  fallback = code
): string {
  return items.find((i) => i.code === code)?.name ?? fallback;
}
