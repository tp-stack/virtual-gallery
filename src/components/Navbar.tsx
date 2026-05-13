"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Collection" },
    { href: "/tour", label: "3D Tour" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? "bg-[#050505]/80 backdrop-blur-xl border-b border-[#232323]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-[#C8A96A] text-lg tracking-widest">◇</span>
          <span className="text-[#F5F2EA] text-sm tracking-[0.12em] uppercase font-light group-hover:text-[#C8A96A] transition-colors duration-500">
            Virtual Gallery
          </span>
        </Link>

        <div className="flex items-center gap-10">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs tracking-[0.12em] uppercase font-light transition-colors duration-500 ${
                pathname === link.href
                  ? "text-[#C8A96A]"
                  : "text-[#B8B2A4] hover:text-[#F5F2EA]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
