"use client";

import { Form, InputNumber } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations, useLocale } from "next-intl";
import { LOCALE_CONFIG } from "@/common/constants/locale.config";
import type { AppLocale } from "@/common/constants/locale.config";

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
      <InputNumber
        disabled={disabled}
        style={{ width: "100%" }}
        formatter={(value) =>
          value
            ? `${config.currency} ${Number(value).toLocaleString(config.locale)}`
            : ""
        }
        min={0}
        step={locale === "vi" ? 1000 : 1}
      />
    </Form.Item>
  );
}
