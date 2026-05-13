"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Artwork } from "@/lib/data";

export default function ArtworkDetail({ artwork }: { artwork: Artwork }) {
  const [isNarrating, setIsNarrating] = useState(false);
  const a = artwork as any;

  const speak = () => {
    if (!window.speechSynthesis) return;
    if (isNarrating) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      a.audio_narration || a.description_long || a.description
    );
    utterance.rate = 0.85;
    utterance.pitch = 0.9;
    utterance.onend = () => setIsNarrating(false);
    window.speechSynthesis.speak(utterance);
    setIsNarrating(true);
  };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="px-8 max-w-[1440px] mx-auto mb-10">
        <Link
          href="/gallery"
          className="text-[#B8B2A4] hover:text-[#C8A96A] transition-colors duration-500 text-xs tracking-[0.12em] uppercase font-light"
        >
          ← Back to Collection
        </Link>
      </div>

      <div className="max-w-[1440px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="relative rounded-[20px] overflow-hidden museum-glow">
              <img
                src={a.image_url_hd || a.image_url_3d || artwork.image_url}
                alt={artwork.title}
                className="w-full h-auto object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col justify-center"
          >
            <div className="gold-line mb-8" />

            <p className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              {a.movement}
            </p>
            <h1 className="font-light text-4xl md:text-5xl text-[#F5F2EA] mb-4 tracking-[-0.02em]">
              {artwork.title}
            </h1>
            <p className="text-[#B8B2A4] text-xl mb-2 font-light">{artwork.artist}</p>
            <p className="text-[#8FA3B8] mb-8 text-sm font-light tracking-wide">
              {a.year} · {a.medium}
            </p>

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

            <p className="text-[#E6E6E6] leading-relaxed mb-8 text-base font-light tracking-wide">
              {a.description_long || a.description}
            </p>

            <button
              onClick={speak}
              className={`px-8 py-3 rounded-[12px] transition-all duration-500 text-xs tracking-[0.08em] uppercase font-medium w-fit ${
                isNarrating
                  ? "bg-[#C8A96A] text-[#050505]"
                  : "border border-[#C8A96A]/30 text-[#C8A96A] hover:bg-[#C8A96A]/5"
              }`}
            >
              {isNarrating ? "⏹ Stop Audio Guide" : "▶ Audio Guide"}
            </button>

            <div className="mt-10 pt-10 border-t border-[#232323]">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Medium", value: a.medium },
                  { label: "Museum", value: a.museum },
                  { label: "Dimensions", value: a.dimensions },
                  { label: "Movement", value: a.movement },
                ].map(
                  (item) =>
                    item.value && (
                      <div key={item.label}>
                        <p className="text-[#B8B2A4] text-2xs mb-1 font-light">{item.label}</p>
                        <p className="text-[#F5F2EA] text-sm font-light">{item.value}</p>
                      </div>
                    )
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
