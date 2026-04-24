"use client";

import { useQuery } from "@tanstack/react-query";
import { masterDataService } from "@/common/services/masterDataService";

export function useMasterData() {
  const floors = useQuery({
    queryKey: ["master", "floors"],
    queryFn: () => masterDataService.floors(),
    staleTime: Infinity,
  });

  const roomTypes = useQuery({
    queryKey: ["master", "room-types"],
    queryFn: () => masterDataService.roomTypes(),
    staleTime: Infinity,
  });

  const roomStatuses = useQuery({
    queryKey: ["master", "room-statuses"],
    queryFn: () => masterDataService.roomStatuses(),
    staleTime: Infinity,
  });

  const bookingStatuses = useQuery({
    queryKey: ["master", "booking-statuses"],
    queryFn: () => masterDataService.bookingStatuses(),
    staleTime: Infinity,
  });

  const paymentMethods = useQuery({
    queryKey: ["master", "payment-methods"],
    queryFn: () => masterDataService.paymentMethods(),
    staleTime: Infinity,
  });

  const serviceItems = useQuery({
    queryKey: ["master", "service-items"],
    queryFn: () => masterDataService.serviceItems(),
    staleTime: Infinity,
  });

  const guestTypes = useQuery({
    queryKey: ["master", "guest-types"],
    queryFn: () => masterDataService.guestTypes(),
    staleTime: Infinity,
  });

  const productCategories = useQuery({
    queryKey: ["master", "product-categories"],
    queryFn: () => masterDataService.productCategories({ isActive: true }),
    staleTime: Infinity,
  });

  const products = useQuery({
    queryKey: ["master", "products"],
    queryFn: () => masterDataService.products({ isActive: true }),
    staleTime: Infinity,
  });

  const expenseCategories = useQuery({
    queryKey: ["master", "expense-categories"],
    queryFn: () => masterDataService.expenseCategories({ isActive: true }),
    staleTime: Infinity,
  });

  const isLoading =
    floors.isLoading ||
    roomTypes.isLoading ||
    roomStatuses.isLoading ||
    bookingStatuses.isLoading;

  return {
    floors: floors.data?.data ?? [],
    roomTypes: roomTypes.data?.data ?? [],
    roomStatuses: roomStatuses.data?.data ?? [],
    bookingStatuses: bookingStatuses.data?.data ?? [],
    paymentMethods: paymentMethods.data?.data ?? [],
    serviceItems: serviceItems.data?.data ?? [],
    guestTypes: guestTypes.data?.data ?? [],
    productCategories: productCategories.data?.data ?? [],
    products: products.data?.data ?? [],
    expenseCategories: expenseCategories.data?.data ?? [],
    isLoading,
  };
}
