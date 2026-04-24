import { ROUTES } from "@/common/constants/routes";
import { PERMISSIONS } from "@/common/constants/permissions";
import type { ElementType } from "react";

export type NavItem = {
  key: string;
  labelKey: string;
  icon?: ElementType;
  href?: string;
  permission?: string;
  roles?: string[];
  children?: NavItem[];
  dividerBefore?: boolean;
};

// Icons are imported dynamically in AppSidebar to keep this config server-safe
export const navigationConfig: NavItem[] = [
  {
    key: "dashboard",
    labelKey: "nav.dashboard",
    icon: undefined,
    href: ROUTES.DASHBOARD,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    key: "room-map",
    labelKey: "nav.roomMap",
    icon: undefined,
    href: ROUTES.ROOM_MAP,
    permission: PERMISSIONS.ROOM_MAP_VIEW,
  },
  {
    key: "rooms",
    labelKey: "nav.rooms",
    icon: undefined,
    href: ROUTES.ROOMS,
    permission: PERMISSIONS.ROOMS_VIEW,
  },
  {
    key: "reservations",
    labelKey: "nav.reservations",
    icon: undefined,
    href: ROUTES.RESERVATIONS,
    permission: PERMISSIONS.BOOKING_VIEW,
  },
  {
    key: "guests",
    labelKey: "nav.guests",
    icon: undefined,
    href: ROUTES.GUESTS,
    permission: PERMISSIONS.GUEST_VIEW,
  },
  // {
  //   key: "housekeeping",
  //   labelKey: "nav.housekeeping",
  //   icon: undefined,
  //   href: ROUTES.HOUSEKEEPING,
  //   permission: PERMISSIONS.HOUSEKEEPING_VIEW,
  // },
  {
    key: "billing",
    labelKey: "nav.billing",
    icon: undefined,
    href: ROUTES.BILLING,
    permission: PERMISSIONS.BILLING_VIEW,
  },
  {
    key: "inventory",
    labelKey: "nav.inventory",
    icon: undefined,
    href: ROUTES.INVENTORY,
    permission: PERMISSIONS.INVENTORY_VIEW,
    roles: ["ADMIN", "MANAGER", "RECEPTIONIST"],
  },
  {
    key: "expenses",
    labelKey: "nav.expenses",
    icon: undefined,
    href: ROUTES.EXPENSES,
    permission: PERMISSIONS.EXPENSES_VIEW,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "finance",
    labelKey: "nav.finance",
    icon: undefined,
    href: ROUTES.FINANCE,
    permission: PERMISSIONS.FINANCE_VIEW,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "history",
    labelKey: "nav.history",
    icon: undefined,
    href: ROUTES.HISTORY,
    permission: PERMISSIONS.AUDIT_LOG_VIEW,
    roles: ["ADMIN", "MANAGER"],
    dividerBefore: true,
  },
  {
    key: "staff",
    labelKey: "nav.staff",
    icon: undefined,
    href: ROUTES.STAFF,
    permission: PERMISSIONS.STAFF_VIEW,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    key: "accounts",
    labelKey: "nav.accounts",
    icon: undefined,
    href: ROUTES.ACCOUNTS,
    permission: PERMISSIONS.STAFF_MANAGE,
    roles: ["ADMIN"],
  },
  {
    key: "settings",
    labelKey: "nav.settings",
    icon: undefined,
    href: ROUTES.SETTINGS,
    permission: PERMISSIONS.SETTINGS_MANAGE,
    roles: ["ADMIN"],
    dividerBefore: true,
  },
  {
    key: "master-data",
    labelKey: "nav.masterData.title",
    icon: undefined,
    dividerBefore: true,
    roles: ["ADMIN", "MANAGER"],
    children: [
      {
        key: "master-floors",
        labelKey: "nav.masterData.floors",
        href: ROUTES.MASTER.FLOORS,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-room-types",
        labelKey: "nav.masterData.roomTypes",
        href: ROUTES.MASTER.ROOM_TYPES,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-room-statuses",
        labelKey: "nav.masterData.roomStatuses",
        href: ROUTES.MASTER.ROOM_STATUSES,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-booking-statuses",
        labelKey: "nav.masterData.bookingStatuses",
        href: ROUTES.MASTER.BOOKING_STATUSES,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-payment-methods",
        labelKey: "nav.masterData.paymentMethods",
        href: ROUTES.MASTER.PAYMENT_METHODS,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-service-items",
        labelKey: "nav.masterData.serviceItems",
        href: ROUTES.MASTER.SERVICE_ITEMS,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-guest-types",
        labelKey: "nav.masterData.guestTypes",
        href: ROUTES.MASTER.GUEST_TYPES,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-amenities",
        labelKey: "nav.masterData.amenities",
        href: ROUTES.MASTER.AMENITIES,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-room-type-pricing",
        labelKey: "nav.masterData.roomTypePricing",
        href: ROUTES.MASTER.ROOM_TYPE_PRICING,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        key: "master-products",
        labelKey: "nav.masterData.products",
        href: ROUTES.MASTER.PRODUCTS,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
        roles: ["ADMIN"],
      },
      {
        key: "master-expense-items",
        labelKey: "nav.masterData.expenseItems",
        href: ROUTES.MASTER.EXPENSE_ITEMS,
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
        roles: ["ADMIN"],
      },
    ],
  },
];
