"use client";

import { Breadcrumb } from "antd";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

const SEGMENT_KEYS: Record<string, string> = {
  dashboard: "nav.dashboard",
  "room-map": "nav.roomMap",
  reservations: "nav.reservations",
  guests: "nav.guests",
  housekeeping: "nav.housekeeping",
  billing: "nav.billing",
  "master-data": "nav.masterData.title",
  floors: "nav.masterData.floors",
  "room-types": "nav.masterData.roomTypes",
  "room-statuses": "nav.masterData.roomStatuses",
  "booking-statuses": "nav.masterData.bookingStatuses",
  "payment-methods": "nav.masterData.paymentMethods",
  "service-items": "nav.masterData.serviceItems",
  "guest-types": "nav.masterData.guestTypes",
  amenities: "nav.masterData.amenities",
};

export default function AppBreadcrumb() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();

  const segments = pathname
    .replace(`/${locale}`, "")
    .split("/")
    .filter(Boolean);

  const items = segments.map((seg, idx) => {
    const href = `/${locale}/${segments.slice(0, idx + 1).join("/")}`;
    const labelKey = SEGMENT_KEYS[seg];
    const label = labelKey ? t(labelKey) : seg;
    const isLast = idx === segments.length - 1;

    return {
      key: seg,
      title: isLast ? label : <Link href={href}>{label}</Link>,
    };
  });

  return (
    <Breadcrumb
      items={[{ key: "home", title: t("nav.home") }, ...items]}
    />
  );
}
