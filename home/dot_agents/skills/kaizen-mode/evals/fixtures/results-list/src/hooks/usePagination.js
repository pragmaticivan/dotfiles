import { useState } from 'react';
import { paginate } from './pagination.js';

export function usePagination(items, pageSize = 25) {
  const [page, setPage] = useState(1);
  const view = paginate(items, page, pageSize);
  return {
    ...view,
    next: () => setPage(Math.min(view.page + 1, view.pageCount)),
    prev: () => setPage(Math.max(view.page - 1, 1)),
  };
}
