"use client";

import { useState } from "react";

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const handleChange = (newPage: number, newLimit?: number) => {
    setPage(newPage);
    if (newLimit) setLimit(newLimit);
  };

  return { page, limit, setPage: handleChange };
}
