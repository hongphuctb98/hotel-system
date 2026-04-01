"use client";

import { Form, Input } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations } from "next-intl";

interface TextFieldProps extends FormItemProps {
  placeholder?: string;
  disabled?: boolean;
  translateLabel?: boolean;
}

export default function TextField({
  label,
  placeholder,
  disabled,
  translateLabel = true,
  ...props
}: TextFieldProps) {
  const t = useTranslations();
  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  return (
    <Form.Item label={displayLabel} {...props}>
      <Input
        placeholder={placeholder}
        disabled={disabled}
        allowClear
      />
    </Form.Item>
  );
}
