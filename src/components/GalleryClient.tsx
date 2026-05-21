"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import ArtworkCard from "./ArtworkCard";
import ArtworkModal from "./ArtworkModal";
import FilterBar from "./FilterBar";
import GallerySkeleton from "./GallerySkeleton";

export default function GalleryClient() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [activeMovement, setActiveMovement] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [movements, setMovements] = useState<{ movement: string; count: number }[]>([]);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setError(null);
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: "50" });
        if (activeMovement) params.set("movement", activeMovement);
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(`/api/artworks?${params}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = await res.json();

        if (append) {
          setArtworks((prev) => [...prev, ...(json.data || [])]);
        } else {
          setArtworks(json.data || []);
        }
        setTotal(json.total || 0);
        setHasMore(json.data?.length === 50);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load artworks");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [activeMovement, searchQuery]
  );

  useEffect(() => {
    pageRef.current = 1;
    setArtworks([]);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
    fetchPage(1, false);
  }, [activeMovement, searchQuery]);

  useEffect(() => {
    (async () => {
      try {
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
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || initialLoading) return;
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
  }, [hasMore, loading, initialLoading, fetchPage]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 max-w-[1440px] mx-auto">
      <div className="mb-16">
        <p className="text-[#C8A96A] text-xs tracking-[0.16em] uppercase mb-3 font-light">Browse</p>
        <h1 className="font-light text-5xl md:text-6xl text-[#F5F2EA] tracking-[-0.02em]">The Collection</h1>
        <p className="text-[#B8B2A4] mt-4 text-sm font-light tracking-wide">
          {initialLoading ? "Loading..." : `${total.toLocaleString()} works`}
        </p>
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
        {error ? (
          <div className="text-center py-32">
            <div className="w-px h-12 bg-[#C8A96A]/40 mx-auto mb-6" />
            <p className="text-[#B8B2A4] text-sm tracking-wide font-light mb-2">Unable to load collection</p>
            <p className="text-[#555] text-xs font-light mb-6">{error}</p>
            <button
              onClick={() => {
                pageRef.current = 1;
                setArtworks([]);
                setInitialLoading(true);
                setError(null);
                fetchPage(1, false);
              }}
              className="px-6 py-2 border border-[#232323] text-[#B8B2A4] text-xs tracking-[0.08em] uppercase rounded-[12px] hover:border-[#C8A96A] hover:text-[#F5F2EA] transition-all duration-500 font-light"
            >
              Retry
            </button>
          </div>
        ) : initialLoading ? (
          <GallerySkeleton />
        ) : artworks.length > 0 ? (
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
        ) : (
          <div className="text-center py-32">
            <div className="w-px h-12 bg-[#C8A96A]/40 mx-auto mb-6" />
            <p className="text-[#B8B2A4] text-sm tracking-wide font-light">No works found</p>
            <p className="text-[#555] text-xs font-light mt-2">Try adjusting your filters or search query</p>
          </div>
        )}

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
