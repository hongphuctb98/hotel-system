"use client";

import { Form, InputNumber } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations } from "next-intl";

interface NumberFieldProps extends FormItemProps {
  min?: number;
  max?: number;
  disabled?: boolean;
  translateLabel?: boolean;
}

export default function NumberField({
  label,
  min,
  max,
  disabled,
  translateLabel = true,
  ...props
}: NumberFieldProps) {
  const t = useTranslations();
  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  return (
    <Form.Item label={displayLabel} {...props}>
      <InputNumber
        min={min}
        max={max}
        disabled={disabled}
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}
