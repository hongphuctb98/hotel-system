import dayjs from "dayjs";
import "dayjs/locale/vi";
import "dayjs/locale/en";
import type { AppLocale } from "@/common/constants/locale.config";
import { LOCALE_CONFIG } from "@/common/constants/locale.config";

export function formatDate(
  date: string | Date | null | undefined,
  locale: AppLocale,
  fmt = "DD/MM/YYYY"
): string {
  if (!date) return "-";
  return dayjs(date).locale(LOCALE_CONFIG[locale].dayjsLocale).format(fmt);
}

export function formatDateTime(
  date: string | Date | null | undefined,
  locale: AppLocale
): string {
  if (!date) return "-";
  return dayjs(date).locale(LOCALE_CONFIG[locale].dayjsLocale).format("DD/MM/YYYY HH:mm");
}

export function diffDays(from: string | Date, to: string | Date): number {
  return dayjs(to).diff(dayjs(from), "day");
}
