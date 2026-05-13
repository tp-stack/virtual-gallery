"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
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
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [movements, setMovements] = useState<{ movement: string; count: number }[]>([]);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
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
      setHasMore(json.data?.length === 50);
      setLoading(false);
    },
    [activeMovement, searchQuery]
  );

  useEffect(() => {
    pageRef.current = 1;
    setArtworks([]);
    setHasMore(true);
    fetchPage(1, false);
  }, [activeMovement, searchQuery]);

  useEffect(() => {
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

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          pageRef.current += 1;
          fetchPage(pageRef.current, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchPage]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 max-w-[1440px] mx-auto">
      <div className="mb-16">
        <p className="text-[#C8A96A] text-xs tracking-[0.16em] uppercase mb-3 font-light">Browse</p>
        <h1 className="font-light text-5xl md:text-6xl text-[#F5F2EA] tracking-[-0.02em]">The Collection</h1>
        <p className="text-[#B8B2A4] mt-4 text-sm font-light tracking-wide">{total.toLocaleString()} works</p>
      </div>

      <div className="gold-line mb-10" />

      <FilterBar
        movements={movements}
        activeMovement={activeMovement}
        onMovementChange={setActiveMovement}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />

      <div className="mt-10">
        {artworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {artworks.map((art, i) => (
              <ArtworkCard
                key={art.id || i}
                artwork={art}
                index={i}
                viewMode={viewMode}
                onClick={() => setSelected(art)}
              />
            ))}
          </div>
        ) : loading ? (
          <div className="text-center py-32">
            <div className="w-6 h-px bg-[#C8A96A]/40 mx-auto animate-pulse" />
          </div>
        ) : (
          <div className="text-center py-32">
            <p className="text-[#B8B2A4] text-sm tracking-wide font-light">No works found</p>
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-4" />

        {loading && artworks.length > 0 && (
          <div className="text-center py-6">
            <div className="w-5 h-px bg-[#C8A96A]/30 mx-auto animate-pulse" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
