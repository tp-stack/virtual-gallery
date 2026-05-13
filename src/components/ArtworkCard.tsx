"use client";

import { motion } from "framer-motion";
import type { Artwork } from "@/lib/data";

export default function ArtworkCard({
  artwork,
  index,
  viewMode,
  onClick,
}: {
  artwork: Artwork;
  index: number;
  viewMode: string;
  onClick: () => void;
}) {
  const isList = viewMode === "list";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 20) * 0.03, duration: 0.5 }}
      layout
    >
      <div
        onClick={onClick}
        className={`plaque group cursor-pointer ${
          isList ? "flex gap-4 p-3" : ""
        }`}
      >
        <div
          className={`relative overflow-hidden ${
            isList
              ? "w-20 h-20 flex-shrink-0 rounded-lg"
              : "aspect-[3/4] rounded-t-[12px]"
          }`}
        >
          <img
            src={artwork.image_url}
            alt={artwork.title}
            className="artwork-img w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
          {(artwork as any).highlight && (
            <div className="absolute top-3 right-3 px-2 py-1 border border-[#C8A96A]/30 text-[#C8A96A] text-[9px] tracking-[0.1em] uppercase rounded-full font-light">
              Featured
            </div>
          )}
        </div>
        <div className={isList ? "flex-1 min-w-0 flex flex-col justify-center" : "p-5"}>
          {!isList && (
            <p className="text-[#B8B2A4] text-2xs mb-1 font-light">
              {(artwork as any).movement}
            </p>
          )}
          <h3
            className={`font-light text-[#F5F2EA] group-hover:text-[#C8A96A] transition-colors duration-500 ${
              isList ? "text-sm truncate" : "text-base"
            }`}
          >
            {artwork.title}
          </h3>
          <p className={`text-[#B8B2A4] font-light ${isList ? "text-xs" : "text-sm"} mt-0.5`}>
            {artwork.artist}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
