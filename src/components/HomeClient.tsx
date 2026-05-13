"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Artwork, Gallery } from "@/lib/data";

export default function HomeClient({ artworks, gallery }: { artworks: Artwork[]; gallery: Gallery }) {
  const featured = artworks.filter((a) => a.highlight).slice(0, 6);

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-500/3 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gallery-600/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <p className="text-gold-500 uppercase tracking-[0.3em] text-sm font-medium mb-6">Virtual Gallery Experience</p>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold leading-none mb-8">
              <span className="text-gallery-50">Timeless</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500">Masterpieces</span>
            </h1>
            <p className="text-gallery-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
              Walk through centuries of human creativity. Every artwork in this gallery lives in the public domain — free for all, forever.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="flex gap-4 justify-center flex-wrap">
            <Link href="/gallery" className="px-8 py-4 bg-gold-500 text-gallery-900 font-semibold rounded-full hover:bg-gold-400 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/20">
              Enter Gallery
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-20 flex justify-center gap-12 text-center">
            <div>
              <p className="text-3xl font-display text-gallery-50">{artworks.length}</p>
              <p className="text-gallery-400 text-sm mt-1">Masterpieces</p>
            </div>
            <div>
              <p className="text-3xl font-display text-gallery-50">{gallery.rooms}</p>
              <p className="text-gallery-400 text-sm mt-1">Gallery Wings</p>
            </div>
            <div>
              <p className="text-3xl font-display text-gallery-50">500+</p>
              <p className="text-gallery-400 text-sm mt-1">Years of Art</p>
            </div>
          </motion.div>
        </div>

        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <div className="w-6 h-10 border-2 border-gallery-500 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-gallery-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="gold-line mb-16" />
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-gold-500 uppercase tracking-widest text-xs mb-3">Collection</p>
            <h2 className="font-display text-4xl md:text-5xl text-gallery-50">Featured Works</h2>
          </div>
          <Link href="/gallery" className="text-gallery-300 hover:text-gold-400 transition-colors text-sm">View all →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((art, i) => (
            <motion.div key={art.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}>
              <Link href={`/artwork/${art.id}`}>
                <div className="artwork-card group relative overflow-hidden rounded-xl bg-gallery-800 border border-gallery-700 hover:border-gold-500/30 transition-all duration-500">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={art.image_url} alt={art.title} className="artwork-img w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gallery-900 via-transparent to-transparent" />
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gold-500/90 text-gallery-900 text-xs font-semibold rounded-full">★ Highlight</div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg text-gallery-50 group-hover:text-gold-400 transition-colors">{art.title}</h3>
                    <p className="text-gallery-400 text-sm mt-1">{art.artist}, {art.year}</p>
                    <p className="text-gallery-500 text-xs mt-2 uppercase tracking-wider">{art.movement}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="gold-line mb-16" />
        <p className="text-gold-500 uppercase tracking-widest text-xs mb-3">Explore</p>
        <h2 className="font-display text-4xl md:text-5xl text-gallery-50 mb-12">Gallery Wings</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.layout.map((room, i) => (
            <motion.div key={room.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="p-6 rounded-xl border border-gallery-700 hover:border-gold-500/30 transition-all duration-300 cursor-pointer group"
              style={{ backgroundColor: room.style.wall_color + "15" }}>
              <h3 className="font-display text-lg text-gallery-100 group-hover:text-gold-400 transition-colors">{room.name}</h3>
              <p className="text-gallery-500 text-sm mt-2">{room.artwork_ids.length} artworks</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: room.style.wall_color }} />
                <span className="text-gallery-500 text-xs capitalize">{room.style.ambience}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="py-16 px-6 border-t border-gallery-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gallery-500 text-sm">All artworks are in the public domain. Images courtesy of Wikimedia Commons.</p>
          <p className="text-gallery-600 text-xs mt-2">Built with a multi-agent AI pipeline · Curated · Verified · Free</p>
        </div>
      </footer>
    </>
  );
}
