"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid as WindowGrid } from "react-window";
import ArtworkCard from "./ArtworkCard";
import ArtworkModal from "./ArtworkModal";
import FilterBar from "./FilterBar";

export default function GalleryClient() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [activeMovement, setActiveMovement] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<{ movement: string; count: number }[]>([]);
  const gridRef = useRef<any>(null);

  const fetchArtworks = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNum), limit: "50" });
    if (activeMovement) params.set("movement", activeMovement);
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/artworks?${params}`);
    const json = await res.json();

    if (append) {
      setArtworks((prev) => [...prev, ...(json.data || [])]);
    } else {
      setArtworks(json.data || []);
    }
    setTotal(json.total || 0);
    setLoading(false);
  }, [activeMovement, searchQuery]);

  // Initial fetch and movements
  useEffect(() => {
    fetchArtworks(1, false);
    fetch("/api/artworks?limit=1")
      .then((r) => r.json())
      .then((d) => setTotal(d.total || 0));

    // Load movements from the data
    (async () => {
      const res = await fetch("/api/artworks?limit=500");
      const json = await res.json();
      const data = json.data || [];
      const map: Record<string, number> = {};
      for (const art of data) {
        map[art.movement] = (map[art.movement] || 0) + 1;
      }
      setMovements(
        Object.entries(map)
          .map(([movement, count]) => ({ movement, count }))
          .sort((a, b) => b.count - a.count)
      );
    })();
  }, []);

  // Filter/page change
  useEffect(() => {
    setPage(1);
    setArtworks([]);
    fetchArtworks(1, false);
  }, [activeMovement, searchQuery]);

  const loadMore = useCallback(() => {
    if (loading || artworks.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArtworks(nextPage, true);
  }, [page, loading, total, artworks.length, fetchArtworks]);

  const rowHeight = 220;
  const columnCount = 4;
  const columnWidth = 280;
  const height = typeof window !== "undefined" ? window.innerHeight - 200 : 800;

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= artworks.length) return null;
    const art = artworks[index];
    return (
      <div style={style}>
        <ArtworkCard
          artwork={art}
          index={index}
          viewMode={viewMode}
          onClick={() => setSelected(art)}
        />
      </div>
    );
  };

  const rowCount = Math.ceil(artworks.length / columnCount);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 max-w-7xl mx-auto">
      <div className="mb-12">
        <p className="text-gold-500 uppercase tracking-widest text-xs mb-3">Browse</p>
        <h1 className="font-display text-5xl md:text-6xl text-gallery-50">
          The Collection
        </h1>
        <p className="text-gallery-400 mt-4 text-lg">
          {total.toLocaleString()} artworks
        </p>
      </div>

      <div className="gold-line mb-8" />

      <FilterBar
        movements={movements}
        activeMovement={activeMovement}
        onMovementChange={setActiveMovement}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />

      <div className="mt-8">
        <WindowGrid
          ref={gridRef}
          height={height}
          width={columnCount * columnWidth + 40}
          columnCount={columnCount}
          columnWidth={columnWidth}
          rowCount={rowCount}
          rowHeight={rowHeight}
          onItemsRendered={({ visibleRowStopIndex }: any) => {
            const lastVisibleItem = (visibleRowStopIndex + 1) * columnCount;
            if (lastVisibleItem >= artworks.length - columnCount && artworks.length < total) {
              loadMore();
            }
          }}
        >
          {Cell}
        </WindowGrid>
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
