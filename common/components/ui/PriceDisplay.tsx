"use client";

import { Typography, theme } from "antd";
import { useLocale } from "next-intl";
import { LOCALE_CONFIG, type AppLocale } from "@/common/constants/locale.config";
import { EXCHANGE_RATES } from "@/common/constants/currency";

interface PriceDisplayProps {
  /** Amount in originalCurrency. Accepts number, Decimal-serialized string, or null/undefined (renders "—"). */
  amount: number | string | null | undefined;
  /** Currency the amount is stored in. Defaults to VND (the DB base currency). */
  originalCurrency?: string;
  /**
   * Currency to display in. Defaults to the current locale's currency
   * (VND for vi, USD for en). Conversion is applied when it differs from originalCurrency.
   */
  targetCurrency?: string;
  /**
   * When true, the price is a type-level fallback (e.g. roomType.defaultPrice)
   * rather than an entity-level override. Rendered in muted gray to signal this.
   */
  isFallback?: boolean;
  className?: string;
}

export default function PriceDisplay({
  amount,
  originalCurrency = "VND",
  targetCurrency,
  isFallback = false,
  className,
}: PriceDisplayProps) {
  const locale = useLocale() as AppLocale;
  const { token } = theme.useToken();
  const config = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG.en;
  const resolvedTarget = targetCurrency ?? config.currency;

  if (amount == null) {
    return (
      <Typography.Text className={className} style={{ color: token.colorTextSecondary }}>
        —
      </Typography.Text>
    );
  }

  const numeric = Number(amount);

  let displayAmount = numeric;
  if (originalCurrency !== resolvedTarget) {
    const rateKey = `${originalCurrency}_TO_${resolvedTarget}`;
    const rate = EXCHANGE_RATES[rateKey] ?? 1;
    displayAmount = numeric * rate;
  }

  const raw = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: resolvedTarget,
    minimumFractionDigits: resolvedTarget === "VND" ? 0 : 2,
    maximumFractionDigits: resolvedTarget === "VND" ? 0 : 2,
  }).format(displayAmount);
  const formatted = config.locale === "vi-VN" ? raw.replace(/\./g, ",") : raw;

  return (
    <Typography.Text
      className={className}
      style={{
        color: isFallback ? token.colorTextSecondary : token.colorText,
        fontWeight: isFallback ? 500 : 600,
      }}
      title={isFallback ? "Default price from room type" : undefined}
    >
      {formatted}
    </Typography.Text>
  );
}
