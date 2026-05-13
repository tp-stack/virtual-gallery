"use client";

import { motion } from "framer-motion";
import type { Artwork } from "@/lib/data";

export default function ArtworkCard({
  artwork, index, viewMode, onClick,
}: {
  artwork: Artwork;
  index: number;
  viewMode: string;
  onClick: () => void;
}) {
  const isList = viewMode === "list";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 20) * 0.03, duration: 0.4 }}
      layout
    >
      <div onClick={onClick}
        className={`artwork-card group relative overflow-hidden rounded-xl bg-gallery-800 border border-gallery-700 hover:border-gold-500/30 transition-all duration-500 cursor-pointer ${isList ? "flex gap-4 p-3" : ""}`}>
        <div className={`relative overflow-hidden ${isList ? "w-24 h-24 flex-shrink-0 rounded-lg" : "aspect-[3/4]"}`}>
          <img src={artwork.image_url} alt={artwork.title} className="artwork-img w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-gallery-900 via-transparent to-transparent" />
          {artwork.highlight && (
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-gold-500/90 text-gallery-900 text-[10px] font-semibold rounded-full">Featured</div>
          )}
        </div>
        <div className={isList ? "flex-1 min-w-0 flex flex-col justify-center" : "p-4"}>
          <h3 className={`font-display text-gallery-50 group-hover:text-gold-400 transition-colors ${isList ? "text-sm truncate" : "text-base"}`}>{artwork.title}</h3>
          <p className={`text-gallery-400 ${isList ? "text-xs" : "text-sm"} mt-0.5`}>{artwork.artist}</p>
          {!isList && <p className="text-gallery-500 text-[11px] mt-2 uppercase tracking-wider">{artwork.movement} · {artwork.year}</p>}
        </div>
      </div>
    </motion.div>
  );
}
