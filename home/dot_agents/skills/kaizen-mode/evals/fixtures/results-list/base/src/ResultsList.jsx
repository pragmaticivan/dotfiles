import { useState } from 'react';

export function ResultsList({ results }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const pageCount = Math.ceil(results.length / pageSize);
  const start = (page - 1) * pageSize;
  const rows = results.slice(start, start + pageSize);

  return (
    <section>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
      <nav>
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
        <span>{page} / {pageCount}</span>
        <button onClick={() => setPage(page + 1)} disabled={page === pageCount}>Next</button>
      </nav>
    </section>
  );
}
