"use client";

import type { QueryClient } from "@tanstack/react-query";

const ENDPOINT_TO_MASTER_KEY: Record<string, string> = {
  "/api/master/floors": "floors",
  "/api/master/room-types": "room-types",
  "/api/master/room-statuses": "room-statuses",
  "/api/master/booking-statuses": "booking-statuses",
  "/api/master/payment-methods": "payment-methods",
  "/api/master/service-items": "service-items",
  "/api/master/guest-types": "guest-types",
  "/api/master/amenities": "amenities",
  "/api/master/product-categories": "product-categories",
  "/api/master/products": "products",
  "/api/master/expense-categories": "expense-categories",
  "/api/master/expense-items": "expense-items",
};

export async function invalidateMasterDataQueries(
  queryClient: QueryClient,
  endpoint: string,
) {
  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: ["master-crud", endpoint] }),
  ];

  const masterKey = ENDPOINT_TO_MASTER_KEY[endpoint];
  if (masterKey) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["master", masterKey] }));
  }

  await Promise.all(invalidations);
}
