"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Artwork } from "@/lib/data";

export default function ArtworkModal({ artwork, onClose }: { artwork: Artwork; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop bg-black/70" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gallery-800 border border-gallery-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={artwork.image_url} alt={artwork.title} className="w-full h-64 md:h-80 object-cover rounded-t-2xl" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">✕</button>
        </div>
        <div className="p-6">
          <p className="text-gold-500 uppercase tracking-widest text-xs mb-1">{artwork.movement}</p>
          <h2 className="font-display text-2xl text-gallery-50 mb-1">{artwork.title}</h2>
          <p className="text-gallery-300 mb-4">{artwork.artist} · {artwork.year}</p>
          <p className="text-gallery-200 mb-6 leading-relaxed">{artwork.description_long}</p>
          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <div className="p-3 rounded-lg bg-gallery-700/50">
              <p className="text-gallery-500 text-xs">Medium</p>
              <p className="text-gallery-200">{artwork.medium}</p>
            </div>
            <div className="p-3 rounded-lg bg-gallery-700/50">
              <p className="text-gallery-500 text-xs">Museum</p>
              <p className="text-gallery-200">{artwork.museum}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {artwork.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-xs rounded-full border border-gallery-600 text-gallery-300">{tag}</span>
            ))}
          </div>
          <Link href={`/artwork/${artwork.id}`}
            className="inline-block px-6 py-3 bg-gold-500 text-gallery-900 font-semibold rounded-full hover:bg-gold-400 transition-all text-sm">
            View Full Details
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
