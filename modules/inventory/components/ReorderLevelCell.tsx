"use client";

import { useState } from "react";
import { InputNumber, Button, App, Space } from "antd";
import { IconCheck, IconX, IconEdit } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useReorderLevelMutation } from "../hooks/useReorderLevelMutation";

interface ReorderLevelCellProps {
  productId: string;
  value: number;
}

export default function ReorderLevelCell({ productId, value }: ReorderLevelCellProps) {
  const t = useTranslations("inventory");
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const mutation = useReorderLevelMutation();

  if (!editing) {
    return (
      <Space size={4}>
        <span>{value}</span>
        <Button type="text" size="small" icon={<IconEdit size={12} />} onClick={() => { setDraft(value); setEditing(true); }} />
      </Space>
    );
  }

  const handleSave = async () => {
    if (!Number.isInteger(draft) || draft < 0) {
      message.error(t("reorderLevelValidation"));
      return;
    }
    try {
      await mutation.mutateAsync({ productId, reorderLevel: draft });
      message.success(t("reorderLevelSaveSuccess"));
      setEditing(false);
    } catch {
      message.error(t("reorderLevelSaveFailed"));
    }
  };

  return (
    <Space size={4}>
      <InputNumber
        size="small"
        value={draft}
        onChange={(v) => setDraft(v ?? 0)}
        min={0}
        precision={0}
        style={{ width: 70 }}
        autoFocus
      />
      <Button type="text" size="small" icon={<IconCheck size={12} />} loading={mutation.isPending} onClick={handleSave} />
      <Button type="text" size="small" icon={<IconX size={12} />} onClick={() => setEditing(false)} />
    </Space>
  );
}
