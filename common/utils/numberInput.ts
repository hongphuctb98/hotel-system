type NumberInputFormatOptions = {
  prefix?: string;
};

export function formatNumberInput(
  value: string | number | null | undefined,
  { prefix }: NumberInputFormatOptions,
): string {
  if (value === null || value === undefined || value === "") return "";

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, "").replace(/,/g, ""));

  if (Number.isNaN(numericValue)) return "";

  // Use a single grouping convention across inputs: comma for thousands.
  // This keeps typing predictable and avoids mixed `.` / `,` separators.
  const formatted = numericValue.toLocaleString("en-US");
  return prefix ? `${prefix} ${formatted}` : formatted;
}

export function parseNumberInput(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, "").replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}
