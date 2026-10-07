import { useEffect, useState } from 'react';
import { searchProducts, type Product } from './searchApi';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    searchProducts(query, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort();
  }, [query]);

  return (
    <div className="search-box">
      <input
        type="search"
        value={query}
        placeholder="Search products"
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul>
        {results.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
