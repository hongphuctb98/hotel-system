"use client";

import { Form, Select } from "antd";
import type { FormItemProps } from "antd";
import { useTranslations } from "next-intl";

interface SelectFieldProps extends FormItemProps {
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  mode?: "multiple" | "tags";
  translateLabel?: boolean;
  allowClear?: boolean;
}

export default function SelectField({
  label,
  options,
  placeholder,
  disabled,
  mode,
  translateLabel = true,
  allowClear = true,
  ...props
}: SelectFieldProps) {
  const t = useTranslations();
  const displayLabel =
    translateLabel && typeof label === "string" ? t(label) : label;

  return (
    <Form.Item label={displayLabel} {...props}>
      <Select
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        mode={mode}
        allowClear={allowClear}
        showSearch
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
      />
    </Form.Item>
  );
}
