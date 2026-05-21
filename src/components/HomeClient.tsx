"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HomeClient() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any>(null);
  const [yearRange, setYearRange] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/artworks?limit=20").then((r) => r.json()),
      fetch("/api/gallery").then((r) => r.json()),
    ])
      .then(([artRes, galRes]) => {
        const arts = artRes.data || [];
        setArtworks(arts);

        const years = arts.map((a: any) => a.year).filter((y: number) => y > 0);
        if (years.length > 0) {
          const min = Math.min(...years);
          const max = Math.max(...years);
          setYearRange(min === max ? `${min}` : `${min}–${max}`);
        }

        if (galRes && galRes.rooms) {
          setGallery({
            name: "The Public Domain Masterpiece Gallery",
            rooms: galRes.total_rooms || galRes.rooms.length || 0,
            layout: (galRes.rooms || []).slice(0, 12).map((r: any) => ({
              id: r.id,
              name: `Room ${r.room_id}`,
              movement: "",
              artwork_ids: [],
              style: { wall_color: "#1E1E1E", floor: "concrete", lighting: "warm", ambience: "modern" },
              dimensions: { width: r.width || 30, height: 5, depth: r.depth || 20 },
              position: r.position || { x: 0, y: 0, z: 0 },
            })),
            featured_artwork: arts[0]?.id || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featured = artworks.filter((a: any) => a.highlight).slice(0, 6);

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#C8A96A]/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#8FA3B8]/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p className="text-[#C8A96A] tracking-[0.16em] text-xs font-light mb-8 uppercase">
              Virtual Gallery Experience
            </p>
            <h1 className="font-light text-7xl md:text-8xl lg:text-9xl leading-[0.9] mb-8 tracking-[-0.03em] text-[#F5F2EA]">
              <span className="font-thin">Timeless</span>
              <br />
              <span className="text-[#C8A96A] font-light">Masterpieces</span>
            </h1>
            <p className="text-[#B8B2A4] text-base md:text-lg max-w-2xl mx-auto mb-14 font-light leading-relaxed tracking-wide">
              Centuries of human creativity, curated and verified in the public domain.
              A museum without walls, built for everyone.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex gap-6 justify-center flex-wrap"
          >
            <Link
              href="/gallery"
              className="px-10 py-4 bg-[#F5F2EA] text-[#050505] font-medium text-sm tracking-[0.08em] uppercase rounded-[12px] hover:bg-[#E6E6E6] transition-all duration-500"
            >
              Explore Collection
            </Link>
            <Link
              href="/tour"
              className="px-10 py-4 border border-[#232323] text-[#B8B2A4] font-light text-sm tracking-[0.08em] uppercase rounded-[12px] hover:border-[#C8A96A] hover:text-[#F5F2EA] transition-all duration-500"
            >
              3D Walkthrough
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mt-24 flex justify-center gap-16 text-center"
          >
            <div>
              <p className="text-3xl font-thin text-[#F5F2EA]">{loading ? "..." : artworks.length}</p>
              <p className="text-[#B8B2A4] text-xs tracking-[0.12em] uppercase mt-2 font-light">Works</p>
            </div>
            <div>
              <p className="text-3xl font-thin text-[#F5F2EA]">{loading ? "..." : gallery?.rooms || 0}</p>
              <p className="text-[#B8B2A4] text-xs tracking-[0.12em] uppercase mt-2 font-light">Galleries</p>
            </div>
            <div>
              <p className="text-3xl font-thin text-[#F5F2EA]">{yearRange || (loading ? "..." : "—")}</p>
              <p className="text-[#B8B2A4] text-xs tracking-[0.12em] uppercase mt-2 font-light">Centuries</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-[#C8A96A]/40 to-transparent" />
        </motion.div>
      </section>

      {/* ─── FEATURED ─── */}
      <section className="py-32 px-8 max-w-[1440px] mx-auto">
        <div className="gold-line mb-16" />
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="text-[#C8A96A] tracking-[0.16em] text-xs font-light mb-3 uppercase">Collection</p>
            <h2 className="font-light text-4xl md:text-5xl text-[#F5F2EA] tracking-[-0.02em]">Featured Works</h2>
          </div>
          <Link
            href="/gallery"
            className="text-[#B8B2A4] hover:text-[#C8A96A] transition-colors duration-500 text-xs tracking-[0.12em] uppercase font-light"
          >
            View all →
          </Link>
        </div>

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((art: any, i: number) => (
              <motion.div
                key={art.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link href={`/artwork/${art.id}`}>
                  <div className="plaque group overflow-hidden">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-t-[12px]">
                      <img
                        src={art.image_url || art.image_url_3d || art.image_url_hd}
                        alt={art.title}
                        className="artwork-img w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                      <div className="absolute top-4 right-4 px-3 py-1.5 border border-[#C8A96A]/30 text-[#C8A96A] text-[10px] tracking-[0.1em] uppercase rounded-full font-light">
                        Featured
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-[#B8B2A4] text-xs tracking-[0.12em] uppercase mb-1 font-light">{art.movement}</p>
                      <h3 className="font-light text-lg text-[#F5F2EA] group-hover:text-[#C8A96A] transition-colors duration-500">
                        {art.title}
                      </h3>
                      <p className="text-[#B8B2A4] text-sm mt-1 font-light">
                        {art.artist}, <span className="text-[#8FA3B8]">{art.year}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ─── ROOMS ─── */}
      {gallery?.layout && (
        <section className="py-32 px-8 max-w-[1440px] mx-auto">
          <div className="gold-line mb-16" />
          <p className="text-[#C8A96A] tracking-[0.16em] text-xs font-light mb-3 uppercase">Explore</p>
          <h2 className="font-light text-4xl md:text-5xl text-[#F5F2EA] mb-16 tracking-[-0.02em]">
            Gallery Wings
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.layout.map((room: any, i: number) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.6 }}
                className="plaque p-6 cursor-pointer group"
              >
                <h3 className="font-light text-base text-[#F5F2EA] group-hover:text-[#C8A96A] transition-colors duration-500">
                  {room.name}
                </h3>
                <p className="text-[#B8B2A4] text-xs mt-2 font-light tracking-wide">View works</p>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-px h-3 bg-[#C8A96A]/40" />
                  <span className="text-[#B8B2A4] text-2xs font-light capitalize">Museum</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="py-16 px-8 border-t border-[#232323]">
        <div className="max-w-[1440px] mx-auto text-center">
          <p className="text-[#B8B2A4] text-xs tracking-[0.08em] font-light">
            All artworks are in the public domain. Images courtesy of Wikimedia Commons and museum open access APIs.
          </p>
          <p className="text-[#555] text-2xs mt-4 font-light tracking-wide">
            Curated · Verified · Free · Built with a multi-agent AI pipeline
          </p>
          <div className="mt-8 flex justify-center gap-8">
            <Link
              href="/disclaimer"
              className="text-[#B8B2A4] hover:text-[#C8A96A] transition-colors duration-500 text-2xs tracking-[0.12em] uppercase font-light"
            >
              Disclaimer
            </Link>
            <Link
              href="/methodology"
              className="text-[#B8B2A4] hover:text-[#C8A96A] transition-colors duration-500 text-2xs tracking-[0.12em] uppercase font-light"
            >
              Methodology
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
