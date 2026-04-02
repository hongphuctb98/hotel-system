"use client";

import { App } from "antd";
import { useTranslations } from "next-intl";

export function useConfirm() {
  const t = useTranslations();
  const { modal } = App.useApp();

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
    modal.confirm({
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
