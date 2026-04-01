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

export type RoomType = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  defaultPrice: number;
  description?: string | null;
  isActive: boolean;
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
