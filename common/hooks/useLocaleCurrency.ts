"use client";

import { useLocale } from "next-intl";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import "dayjs/locale/en";
import { LOCALE_CONFIG } from "@/common/constants/locale.config";
import type { AppLocale } from "@/common/constants/locale.config";

export function useLocaleCurrency() {
  const appLocale = useLocale() as AppLocale;
  const config = LOCALE_CONFIG[appLocale] ?? LOCALE_CONFIG.en;

  dayjs.locale(config.dayjsLocale);

  const format = (amount: number) =>
    new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      minimumFractionDigits: appLocale === "vi" ? 0 : 2,
    }).format(amount);

  const formatDate = (date: string | Date | null | undefined, fmt = "DD/MM/YYYY") => {
    if (!date) return "-";
    return dayjs(date).locale(config.dayjsLocale).format(fmt);
  };
   const formatDateShort = (date: string | Date | null | undefined, fmt = "DD/MM/YY") => {
    if (!date) return "-";
    return dayjs(date).locale(config.dayjsLocale).format(fmt);
  };

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return dayjs(date).locale(config.dayjsLocale).format("DD/MM/YYYY HH:mm");
  };

  return {
    format,
    formatDate,
    formatDateShort,
    formatDateTime,
    currency: config.currency,
    appLocale,
    numberLocale: config.locale,
  };
}
