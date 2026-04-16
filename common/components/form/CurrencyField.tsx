"use client";

import { Form, InputNumber } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations, useLocale } from "next-intl";
import { LOCALE_CONFIG } from "@/common/constants/locale.config";
import type { AppLocale } from "@/common/constants/locale.config";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";

interface CurrencyFieldProps extends FormItemProps {
  disabled?: boolean;
  translateLabel?: boolean;
}

export default function CurrencyField({
  label,
  disabled,
  translateLabel = true,
  ...props
}: CurrencyFieldProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const config = LOCALE_CONFIG[locale];

  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  return (
    <Form.Item label={displayLabel} {...props}>
      <InputNumber<number>
        disabled={disabled}
        style={{ width: "100%" }}
        formatter={(value) =>
          formatNumberInput(value, { prefix: config.currency })
        }
        parser={(value) => parseNumberInput(value)}
        min={0}
        step={locale === "vi" ? 1000 : 1}
      />
    </Form.Item>
  );
}
