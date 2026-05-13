"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Artwork } from "@/lib/data";
import ArtworkCard from "./ArtworkCard";
import ArtworkModal from "./ArtworkModal";
import FilterBar from "./FilterBar";

export default function GalleryClient({
  artworks,
  movements,
}: {
  artworks: Artwork[];
  movements: { movement: string; count: number }[];
}) {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [activeMovement, setActiveMovement] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("masonry");

  const filtered = useMemo(() => {
    return artworks.filter((art) => {
      if (activeMovement && art.movement !== activeMovement) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!art.title.toLowerCase().includes(q) &&
            !art.artist.toLowerCase().includes(q) &&
            !art.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [artworks, activeMovement, searchQuery]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 max-w-7xl mx-auto">
      <div className="mb-12">
        <p className="text-gold-500 uppercase tracking-widest text-xs mb-3">Browse</p>
        <h1 className="font-display text-5xl md:text-6xl text-gallery-50">The Collection</h1>
        <p className="text-gallery-400 mt-4 text-lg">{artworks.length} artworks across {movements.length} movements</p>
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

      <AnimatePresence mode="wait">
        <motion.div
          key={activeMovement || "all"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={
            viewMode === "masonry" ? "masonry mt-8"
            : viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8"
            : "flex flex-col gap-4 mt-8"
          }
        >
          {filtered.map((art, i) => (
            <ArtworkCard key={art.id} artwork={art} index={i} viewMode={viewMode} onClick={() => setSelected(art)} />
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-24">
          <p className="text-gallery-400 text-xl">No artworks found matching your criteria.</p>
          <button onClick={() => { setActiveMovement(null); setSearchQuery(""); }}
            className="mt-4 text-gold-500 hover:text-gold-400 transition-colors">
            Clear filters
          </button>
        </div>
      )}

      <AnimatePresence>
        {selected && <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
