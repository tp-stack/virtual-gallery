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
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [activeMedium, setActiveMedium] = useState<string | null>(null);
  const [activeInstitution, setActiveInstitution] = useState<string | null>(null);
  const [activeYearMin, setActiveYearMin] = useState<number | null>(null);
  const [activeYearMax, setActiveYearMax] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [movements, setMovements] = useState<{ movement: string; count: number }[]>([]);
  const [artists, setArtists] = useState<{ artist: string; count: number }[]>([]);
  const [mediums, setMediums] = useState<{ medium: string; count: number }[]>([]);
  const [institutions, setInstitutions] = useState<{ institution: string; count: number }[]>([]);
  const [yearRange, setYearRange] = useState({ min: 0, max: 0 });
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setError(null);
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: "50" });
        if (activeMovement) params.set("movement", activeMovement);
        if (activeArtist) params.set("artist", activeArtist);
        if (activeMedium) params.set("medium", activeMedium);
        if (activeInstitution) params.set("institution", activeInstitution);
        if (activeYearMin) params.set("year_min", String(activeYearMin));
        if (activeYearMax) params.set("year_max", String(activeYearMax));
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
        setHasMore(Boolean(json.hasMore ?? json.data?.length === 50));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load artworks");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [activeMovement, activeArtist, activeMedium, activeInstitution, activeYearMin, activeYearMax, searchQuery]
  );

  useEffect(() => {
    pageRef.current = 1;
    setArtworks([]);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
    fetchPage(1, false);
  }, [activeMovement, activeArtist, activeMedium, activeInstitution, activeYearMin, activeYearMax, searchQuery, fetchPage]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/facets");
        const json = await res.json();
        setMovements(json.movements || []);
        setArtists(json.artists || []);
        setMediums(json.mediums || []);
        setInstitutions(json.institutions || []);
        if (json.yearRange) setYearRange(json.yearRange);
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
        artists={artists}
        activeArtist={activeArtist}
        onArtistChange={setActiveArtist}
        mediums={mediums}
        activeMedium={activeMedium}
        onMediumChange={setActiveMedium}
        institutions={institutions}
        activeInstitution={activeInstitution}
        onInstitutionChange={setActiveInstitution}
        yearRange={yearRange}
        activeYearMin={activeYearMin}
        activeYearMax={activeYearMax}
        onYearChange={(min, max) => { setActiveYearMin(min); setActiveYearMax(max); }}
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
