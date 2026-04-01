"use client";

import { Modal } from "antd";
import { useTranslations } from "next-intl";

export function useConfirm() {
  const t = useTranslations();

  const confirm = ({
    title,
    content,
    onOk,
    danger = false,
  }: {
    title?: string;
    content?: string;
    onOk: () => void | Promise<void>;
    danger?: boolean;
  }) => {
    Modal.confirm({
      title: title ?? t("common.confirmTitle"),
      content: content ?? t("common.confirmContent"),
      okType: danger ? "danger" : "primary",
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk,
    });
  };

  return { confirm };
}
