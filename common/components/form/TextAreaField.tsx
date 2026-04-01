"use client";

import { Form, Input } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations } from "next-intl";

interface TextAreaFieldProps extends FormItemProps {
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  translateLabel?: boolean;
}

export default function TextAreaField({
  label,
  placeholder,
  rows = 3,
  disabled,
  translateLabel = true,
  ...props
}: TextAreaFieldProps) {
  const t = useTranslations();
  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  return (
    <Form.Item label={displayLabel} {...props}>
      <Input.TextArea
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
    </Form.Item>
  );
}
