"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Artwork } from "@/lib/data";

export default function ArtworkModal({
  artwork,
  onClose,
}: {
  artwork: Artwork;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const a = artwork as any;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-[#0D0D0D] border border-[#232323] rounded-[20px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-museum"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={a.image_url_hd || a.image_url_3d || a.image_url}
            alt={artwork.title}
            className="w-full h-72 md:h-96 object-cover rounded-t-[20px]"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#050505]/60 border border-[#232323] text-[#B8B2A4] flex items-center justify-center hover:bg-[#050505]/80 hover:text-[#F5F2EA] transition-all duration-300 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-8 md:p-10">
          <p className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase font-light mb-2">
            {a.movement}
          </p>
          <h2 className="font-light text-3xl md:text-4xl text-[#F5F2EA] mb-2 tracking-[-0.02em]">
            {artwork.title}
          </h2>
          <p className="text-[#B8B2A4] text-base mb-8 font-light">
            {artwork.artist} · <span className="text-[#8FA3B8]">{a.year}</span>
          </p>

          <p className="text-[#E6E6E6] leading-relaxed mb-8 font-light text-sm tracking-wide">
            {a.description_long || a.description}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Medium", value: a.medium },
              { label: "Museum", value: a.museum },
              { label: "Dimensions", value: a.dimensions },
              { label: "Movement", value: a.movement },
            ].map(
              (item) =>
                item.value && (
                  <div key={item.label} className="p-4 rounded-[12px] bg-[#161616] border border-[#232323]">
                    <p className="text-[#B8B2A4] text-2xs mb-1 font-light">{item.label}</p>
                    <p className="text-[#F5F2EA] text-sm font-light">{item.value}</p>
                  </div>
                )
            )}
          </div>

          {(a.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {(a.tags as string[]).map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-[10px] tracking-[0.08em] uppercase rounded-full border border-[#232323] text-[#B8B2A4] font-light"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <Link
            href={`/artwork/${artwork.id}`}
            className="inline-block px-8 py-3 bg-[#F5F2EA] text-[#050505] font-medium text-xs tracking-[0.08em] uppercase rounded-[12px] hover:bg-[#E6E6E6] transition-all duration-500"
          >
            View Full Details
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
