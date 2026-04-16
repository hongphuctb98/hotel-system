"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Menu } from "antd";
import Link from "next/link";
import {
  IconDashboard,
  IconBuildingSkyscraper,
  IconDoor,
  IconCalendarEvent,
  IconUsers,
  IconVacuumCleaner,
  IconReceipt,
  IconSettings,
  IconBed,
  IconLayersLinked,
  IconCircleCheck,
  IconCreditCard,
  IconToolsKitchen2,
  IconUserStar,
  IconIdBadge2,
  IconStairs,
  IconSparkles,
  IconReportMoneyFilled,
  IconClipboardList,
  IconActivityHeartbeat,
} from "@tabler/icons-react";
import { navigationConfig, type NavItem } from "@/configs/navigation.config";
import { usePermission } from "@/common/hooks/usePermission";
import { useAuthRole } from "@/providers/AuthRoleProvider";

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: IconDashboard,
  "room-map": IconBuildingSkyscraper,
  rooms: IconDoor,
  reservations: IconCalendarEvent,
  guests: IconUsers,
  housekeeping: IconVacuumCleaner,
  billing: IconReceipt,
  staff: IconIdBadge2,
  settings: IconSettings,
  "master-data": IconClipboardList,
  "master-floors": IconStairs,
  "master-room-types": IconBed,
  "master-room-statuses": IconLayersLinked,
  "master-booking-statuses": IconCircleCheck,
  "master-payment-methods": IconCreditCard,
  "master-service-items": IconToolsKitchen2,
  "master-guest-types": IconUserStar,
  "master-amenities": IconSparkles,
  "master-room-type-pricing": IconReportMoneyFilled,
  history: IconActivityHeartbeat,
};

function buildMenuItems(
  items: NavItem[],
  t: (key: string) => string,
  hasPermission: (p?: string, roles?: string[]) => boolean,
  locale: string
): { key: string; icon?: React.ReactNode; label: React.ReactNode; children?: unknown[] }[] {
  return items
    .filter((item) => hasPermission(item.permission, item.roles))
    .map((item) => {
      const Icon = ICON_MAP[item.key];
      if (item.children) {
        return {
          key: item.key,
          icon: Icon ? <Icon size={16} /> : undefined,
          label: t(item.labelKey),
          children: buildMenuItems(item.children, t, hasPermission, locale),
        };
      }
      return {
        key: item.key,
        icon: Icon ? <Icon size={16} /> : undefined,
        label: item.href ? (
          <Link href={`/${locale}${item.href}`}>{t(item.labelKey)}</Link>
        ) : (
          t(item.labelKey)
        ),
      };
    });
}

function getActiveKeys(
  items: NavItem[],
  pathname: string,
  locale: string
): { selectedKey: string; openKeys: string[] } {
  for (const item of items) {
    const fullHref = `/${locale}${item.href ?? ""}`;
    if (item.href && pathname.startsWith(fullHref)) {
      return { selectedKey: item.key, openKeys: [] };
    }
    if (item.children) {
      const child = item.children.find(
        (c) => c.href && pathname.startsWith(`/${locale}${c.href}`)
      );
      if (child) return { selectedKey: child.key, openKeys: [item.key] };
    }
  }
  return { selectedKey: "", openKeys: [] };
}

export default function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);

  const { selectedKey, openKeys } = getActiveKeys(navigationConfig, pathname, locale);
  const menuItems = buildMenuItems(navigationConfig, t, hasPermission, locale);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-center border-b"
        style={{ height: 64, borderColor: "var(--border-color, #e8ecf0)" }}
      >
        {collapsed ? (
          <span className="font-bold text-lg text-blue-600">H</span>
        ) : (
          <span className="font-bold text-lg text-blue-600">HotelOS</span>
        )}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={openKeys}
        items={menuItems as never}
        inlineCollapsed={collapsed}
        style={{ border: "none", flex: 1, overflowY: "auto" }}
      />
    </div>
  );
}
