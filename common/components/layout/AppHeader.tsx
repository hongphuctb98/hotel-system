"use client";

import { Badge, Avatar, Dropdown, Button, Space } from "antd";
import { IconBell, IconMenu2, IconSun, IconMoon } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import AppBreadcrumb from "./AppBreadcrumb";
import { useThemeStore } from "@/providers/ThemeProvider";

export default function AppHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useThemeStore();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const userMenuItems = [
    { key: "profile", label: t("header.profile") },
    { key: "settings", label: t("header.settings") },
    { type: "divider" as const },
    { key: "logout", label: t("header.logout"), danger: true },
  ];

  return (
    <div className="flex items-center justify-between h-full px-4">
      <div className="flex items-center gap-3">
        <Button
          type="text"
          icon={<IconMenu2 size={18} />}
          onClick={onToggle}
        />
        <AppBreadcrumb />
      </div>

      <Space size="middle">
        <Space size={4}>
          <Button
            size="small"
            type={locale === "vi" ? "primary" : "text"}
            onClick={() => switchLocale("vi")}
          >
            VI
          </Button>
          <Button
            size="small"
            type={locale === "en" ? "primary" : "text"}
            onClick={() => switchLocale("en")}
          >
            EN
          </Button>
        </Space>

        <Button
          type="text"
          icon={isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
          onClick={toggleTheme}
        />

        <Badge count={3} size="small">
          <Button type="text" icon={<IconBell size={18} />} />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Avatar
            style={{ cursor: "pointer", backgroundColor: "#1677ff" }}
            size="small"
          >
            A
          </Avatar>
        </Dropdown>
      </Space>
    </div>
  );
}
