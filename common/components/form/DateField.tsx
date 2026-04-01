"use client";

import { Form, DatePicker } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations } from "next-intl";

interface DateFieldProps extends FormItemProps {
  disabled?: boolean;
  format?: string;
  showTime?: boolean;
  translateLabel?: boolean;
}

export default function DateField({
  label,
  disabled,
  format = "DD/MM/YYYY",
  showTime,
  translateLabel = true,
  ...props
}: DateFieldProps) {
  const t = useTranslations();
  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  return (
    <Form.Item label={displayLabel} {...props}>
      <DatePicker
        format={format}
        disabled={disabled}
        showTime={showTime}
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}
