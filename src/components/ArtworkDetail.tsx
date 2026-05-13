"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Artwork } from "@/lib/data";

export default function ArtworkDetail({ artwork }: { artwork: Artwork }) {
  const [isNarrating, setIsNarrating] = useState(false);

  const speak = () => {
    if (!window.speechSynthesis) return;
    if (isNarrating) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(artwork.audio_narration || artwork.description_long);
    utterance.rate = 0.9;
    utterance.pitch = 0.9;
    utterance.onend = () => setIsNarrating(false);
    window.speechSynthesis.speak(utterance);
    setIsNarrating(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="px-6 max-w-7xl mx-auto mb-8">
        <Link href="/gallery" className="text-gallery-400 hover:text-gold-400 transition-colors text-sm">← Back to Gallery</Link>
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="relative rounded-2xl overflow-hidden gold-glow">
              <img src={artwork.image_url} alt={artwork.title} className="w-full h-auto object-cover" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex flex-col justify-center">
            <div className="gold-line mb-6" />
            <p className="text-gold-500 uppercase tracking-widest text-xs mb-2">{artwork.movement}</p>
            <h1 className="font-display text-4xl md:text-5xl text-gallery-50 mb-4">{artwork.title}</h1>
            <p className="text-gallery-300 text-xl mb-2">{artwork.artist}</p>
            <p className="text-gallery-400 mb-6">{artwork.year} · {artwork.medium}</p>

            <div className="flex flex-wrap gap-2 mb-8">
              {artwork.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-xs rounded-full border border-gallery-600 text-gallery-300">{tag}</span>
              ))}
            </div>

            <p className="text-gallery-200 leading-relaxed mb-8 text-lg">{artwork.description_long}</p>

            <button onClick={speak}
              className={`px-6 py-3 rounded-full transition-all duration-300 flex items-center gap-2 w-fit ${
                isNarrating ? "bg-gold-500 text-gallery-900" : "border border-gold-500 text-gold-400 hover:bg-gold-500/10"
              }`}>
              {isNarrating ? "⏹ Stop" : "▶ Audio Guide"}
            </button>

            <div className="mt-8 pt-8 border-t border-gallery-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gallery-500">Medium</p><p className="text-gallery-200">{artwork.medium}</p></div>
                <div><p className="text-gallery-500">Museum</p><p className="text-gallery-200">{artwork.museum}</p></div>
                <div><p className="text-gallery-500">Dimensions</p><p className="text-gallery-200">{artwork.dimensions}</p></div>
                <div><p className="text-gallery-500">Movement</p><p className="text-gallery-200">{artwork.movement}</p></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
