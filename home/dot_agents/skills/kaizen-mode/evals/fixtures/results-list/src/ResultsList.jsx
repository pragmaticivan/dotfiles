import { usePagination } from './hooks/usePagination.js';

export function ResultsList({ results }) {
  const { rows, page, pageCount, next, prev } = usePagination(results, 25);

  return (
    <section>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
      <nav>
        <button onClick={prev} disabled={page === 1}>Prev</button>
        <span>{page} / {pageCount}</span>
        <button onClick={next} disabled={page === pageCount}>Next</button>
      </nav>
    </section>
  );
}
