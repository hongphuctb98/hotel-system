export const locales = ["en", "vi"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

export const LOCALE_CONFIG = {
  en: {
    label: "EN",
    currency: "USD",
    locale: "en-US",
    dayjsLocale: "en",
    antdLocale: "en_US",
  },
  vi: {
    label: "VI",
    currency: "VND",
    locale: "vi-VN",
    dayjsLocale: "vi",
    antdLocale: "vi_VN",
  },
} as const;
