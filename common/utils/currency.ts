import type { AppLocale } from "@/common/constants/locale.config";
import { LOCALE_CONFIG } from "@/common/constants/locale.config";

export function formatCurrency(amount: number, locale: AppLocale): string {
  const config = LOCALE_CONFIG[locale];
  const raw = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: locale === "vi" ? 0 : 2,
  }).format(amount);
  return config.locale === "vi-VN" ? raw.replace(/\./g, ",") : raw;
}
