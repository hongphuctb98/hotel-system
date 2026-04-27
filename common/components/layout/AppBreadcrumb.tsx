"use client";

import { Breadcrumb } from "antd";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

const SEGMENT_KEYS: Record<string, string> = {
  dashboard: "nav.dashboard",
  "room-map": "nav.roomMap",
  rooms: "nav.rooms",
  reservations: "nav.reservations",
  guests: "nav.guests",
  housekeeping: "nav.housekeeping",
  billing: "nav.billing",
  inventory: "nav.inventory",
  expenses: "nav.expenses",
  finance: "nav.finance",
  history: "nav.history",
  accounts: "nav.accounts",
  settings: "nav.settings",
  staff: "nav.staff",
  "master-data": "nav.masterData.title",
  floors: "nav.masterData.floors",
  "room-types": "nav.masterData.roomTypes",
  "room-statuses": "nav.masterData.roomStatuses",
  "booking-statuses": "nav.masterData.bookingStatuses",
  "payment-methods": "nav.masterData.paymentMethods",
  "service-items": "nav.masterData.serviceItems",
  "guest-types": "nav.masterData.guestTypes",
  amenities: "nav.masterData.amenities",
  "room-type-pricing": "nav.masterData.roomTypePricing",
  "product-categories": "nav.masterData.productCategories",
  products: "nav.masterData.products",
  "expense-categories": "nav.masterData.expenseCategories",
  "expense-items": "nav.masterData.expenseItems",
  new: "common.add",
  edit: "common.edit",
};

const ACTION_SEGMENTS = new Set(["new", "edit"]);

export default function AppBreadcrumb() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();

  const segments = pathname
    .replace(`/${locale}`, "")
    .split("/")
    .filter(Boolean);

  const visibleSegments = segments
    .map((seg, idx) => ({ seg, idx }))
    .filter(({ seg, idx }) => {
      const nextSegment = segments[idx + 1];
      const isOpaqueDynamicSegment = !SEGMENT_KEYS[seg];

      return !(isOpaqueDynamicSegment && nextSegment && ACTION_SEGMENTS.has(nextSegment));
    });

  const items = visibleSegments.map(({ seg, idx }, visibleIdx) => {
    const href = `/${locale}/${segments.slice(0, idx + 1).join("/")}`;
    const labelKey = SEGMENT_KEYS[seg];
    const label = labelKey ? t(labelKey) : seg;
    const isLast = visibleIdx === visibleSegments.length - 1;
    const isDynamic = !labelKey;

    const text = isDynamic
      ? <span className="max-w-32 truncate inline-block align-middle" title={label}>{label}</span>
      : label;

    return {
      key: href,
      title: isLast ? text : <Link href={href}>{text}</Link>,
    };
  });

  return (
    <div className="hidden md:block">
      <Breadcrumb
        items={[{ key: "home", title: t("nav.home") }, ...items]}
      />
    </div>
  );
}
