"use client";

import { useState } from "react";

type ImageResult = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  creator?: string;
  license?: string;
};

export function ImageSearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (image: { url: string; name: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Search failed");
      setResults([]);
      return;
    }
    setResults(data.results ?? []);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-lg dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Share an image
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          Searches openly-licensed images from Openverse. Safe-content filtered.
        </p>

        <div className="mb-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="e.g. sunset, cat, flowers"
            autoFocus
            className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700"
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        {searched && !loading && !error && results.length === 0 && (
          <p className="text-sm text-zinc-400">No results.</p>
        )}

        <div className="grid grid-cols-4 gap-2 overflow-y-auto">
          {results.map((img) => (
            <button
              key={img.id}
              onClick={() => onSelect({ url: img.url, name: img.title })}
              className="aspect-square overflow-hidden rounded-lg border border-zinc-200 hover:ring-2 hover:ring-pink-500 dark:border-zinc-700"
              title={img.creator ? `By ${img.creator}` : img.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbnail}
                alt={img.title}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
