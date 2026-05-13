import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Virtual Gallery — Public Domain Masterpieces",
  description: "A virtual gallery of the world's greatest public-domain artworks, curated by an AI multi-agent pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gallery-900">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
