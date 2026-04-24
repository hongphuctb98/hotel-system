import type { ComponentType } from "react";
import type { ColumnType } from "antd/es/table";

export type Floor = {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomTypePricing = {
  id: string;
  roomTypeId: string;
  nightlyPrice: number | null;
  dailyPrice: number | null;
  hourlyBlockHours: number | null;
  hourlyBlockPrice: number | null;
  hourlyExtraPrice: number | null;
};

export type RoomType = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  description?: string | null;
  isActive: boolean;
  pricing?: RoomTypePricing | null;
};

export type RoomStatus = {
  id: string;
  code: string;
  name: string;
  color: string;
  isSellable: boolean;
  isActive: boolean;
};

export type BookingStatus = {
  id: string;
  code: string;
  name: string;
  color: string;
  isActive: boolean;
};

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type ServiceItem = {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  unit?: string | null;
  isActive: boolean;
  linkedProductId?: string | null;
  linkedProduct?: {
    id: string;
    name: string;
    unit: string;
    inventory?: { quantity: number; reorderLevel: number } | null;
  } | null;
};

export type GuestType = {
  id: string;
  code: string;
  name: string;
  color: string;
  isActive: boolean;
};

export type Amenity = {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  isActive: boolean;
};

export type ProductCategory = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  categoryId?: string | null;
  category?: ProductCategory | null;
  linkedServiceItem?: { id: string; name: string; code: string } | null;
  isActive: boolean;
  inventory?: {
    quantity: number;
    reorderLevel: number;
    lastStocktakeAt?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseItem = {
  id: string;
  categoryId: string;
  category?: ExpenseCategory | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  isRecurring: boolean;
  defaultVendor?: string | null;
  defaultAmount?: number | null;
  defaultPaymentMethodId?: string | null;
  defaultPaymentMethod?: PaymentMethod | null;
  createdAt: string;
  updatedAt: string;
};

export type MasterDataConfig<T> = {
  endpoint: string;
  titleKey: string;
  columns: ColumnType<T>[];
  FormComponent: ComponentType<{
    initialValues?: T | null;
    onSuccess: () => void;
    endpoint: string;
  }>;
};
