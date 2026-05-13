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
    { href: "/gallery", label: "Gallery" },
    { href: "/tour", label: "3D Tour" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? "bg-gallery-900/80 backdrop-blur-xl border-b border-gallery-800" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-gold-500 text-lg">◈</span>
          <span className="font-display text-gallery-50 text-lg group-hover:text-gold-400 transition-colors">Virtual Gallery</span>
        </Link>
        <div className="flex items-center gap-8">
          {links.map((link) => (
            <Link key={link.href} href={link.href}
              className={`text-sm transition-colors ${pathname === link.href ? "text-gold-400" : "text-gallery-300 hover:text-gallery-50"}`}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
