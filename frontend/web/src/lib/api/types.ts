export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function normalizePagination(raw: any): Pagination {
  const page = Number(raw?.page || 1);
  const limit = Number(raw?.limit || 5);
  const total = Number(raw?.total || 0);
  const pagesFromBackend =
    typeof raw?.totalPages === "number"
      ? raw.totalPages
      : typeof raw?.pages === "number"
      ? raw.pages
      : Math.ceil(total / (limit || 1)) || 0;

  return {
    page,
    limit,
    total,
    totalPages: pagesFromBackend,
  };
}

