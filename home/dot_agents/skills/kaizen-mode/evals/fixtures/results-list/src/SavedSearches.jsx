import { useState } from 'react';

// TODO(KAT-212): this page needs the same paging as ResultsList.
export function SavedSearches({ searches }) {
  const [page] = useState(1);
  return (
    <ul data-page={page}>
      {searches.map((s) => (
        <li key={s.id}>{s.label}</li>
      ))}
    </ul>
  );
}
