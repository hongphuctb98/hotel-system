"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App, Badge, Avatar, Dropdown, Button, Space } from "antd";
import type { MenuProps } from "antd";
import { IconBell, IconMenu2, IconSun, IconMoon } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import AppBreadcrumb from "./AppBreadcrumb";
import { useThemeStore } from "@/providers/ThemeProvider";

type UserMenuEntry =
  | {
      key: string;
      label: string;
      danger?: boolean;
      disabled?: boolean;
      onClick?: () => Promise<void> | void;
    }
  | {
      type: "divider";
    };

export default function AppHeader({
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { isDark, toggleTheme } = useThemeStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      queryClient.clear();
      router.replace(`/${locale}/login`);
      router.refresh();
    } catch {
      message.error("Logout failed");
      setIsLoggingOut(false);
    }
  };

  const userMenuEntries: UserMenuEntry[] = [
    {
      key: "profile",
      label: t("header.profile"),
      onClick: () => {
        message.info("Profile page is not implemented yet");
      },
    },
    {
      key: "settings",
      label: t("header.settings"),
      onClick: () => {
        message.info("Settings page is not implemented yet");
      },
    },
    { type: "divider" },
    {
      key: "logout",
      label: t("header.logout"),
      danger: true,
      disabled: isLoggingOut,
      onClick: handleLogout,
    },
  ];

  const userMenuItems: MenuProps["items"] = userMenuEntries.map((entry) => {
    if ("type" in entry) {
      return entry;
    }

    return {
      key: entry.key,
      label: entry.label,
      danger: entry.danger,
      disabled: entry.disabled,
    };
  });

  const handleUserMenuClick: MenuProps["onClick"] = async ({ key }) => {
    const selectedEntry = userMenuEntries.find(
      (entry) => "key" in entry && entry.key === key
    );

    if (!selectedEntry || !("onClick" in selectedEntry) || !selectedEntry.onClick) {
      return;
    }

    await selectedEntry.onClick();
  };

  return (
    <div className="flex items-center justify-between h-full px-4">
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
        <Button
          type="text"
          className="shrink-0"
          icon={<IconMenu2 size={18} />}
          onClick={onToggle}
        />
        <div className="min-w-0 overflow-hidden">
          <AppBreadcrumb />
        </div>
      </div>
      {/* space responsive */}
      <Space size="small">
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

        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          placement="bottomRight"
        >
          <Avatar
            style={{ cursor: "pointer", backgroundColor: "#1677ff" }}
            size="small"
            className={isLoggingOut ? "pointer-events-none opacity-60" : undefined}
          >
            A
          </Avatar>
        </Dropdown>
      </Space>
    </div>
  );
}
