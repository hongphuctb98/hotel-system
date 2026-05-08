"use client";

import { Form, Input, InputNumber, Space } from "antd";
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
  // form-binding props → inner noStyle Form.Item
  name,
  rules,
  required,
  initialValue,
  dependencies,
  getValueFromEvent,
  normalize,
  validateTrigger,
  valuePropName,
  validateFirst,
  hasFeedback,
  preserve,
  shouldUpdate,
  // layout props → outer Form.Item
  ...layoutProps
}: CurrencyFieldProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const config = LOCALE_CONFIG[locale];

  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  const bindingProps: FormItemProps = {
    name,
    rules,
    required,
    initialValue,
    dependencies,
    getValueFromEvent,
    normalize,
    validateTrigger,
    valuePropName,
    validateFirst,
    hasFeedback,
    preserve,
    shouldUpdate,
  };

  return (
    <Form.Item label={displayLabel} {...layoutProps}>
      <Space.Compact style={{ width: "100%" }}>
        <Form.Item {...bindingProps} noStyle>
          <InputNumber<number>
            disabled={disabled}
            style={{ width: "100%" }}
            formatter={(value) => formatNumberInput(value, {})}
            parser={(value) => parseNumberInput(value)}
            min={0}
            step={locale === "vi" ? 1000 : 1}
          />
        </Form.Item>
        <Input
          readOnly
          value={config.currency}
          style={{ width: "auto", minWidth: 52, textAlign: "center", cursor: "default", color: "inherit" }}
          tabIndex={-1}
        />
      </Space.Compact>
    </Form.Item>
  );
}
