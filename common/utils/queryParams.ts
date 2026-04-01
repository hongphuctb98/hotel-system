export function parseQueryParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const search = searchParams.get("search") ?? undefined;
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") ?? "asc";

  const filters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (!["page", "limit", "search", "sortBy", "sortOrder"].includes(key)) {
      filters[key] = value;
    }
  });

  return { page, limit, search, sortBy, sortOrder, filters };
}
