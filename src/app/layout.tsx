import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import PrototypeBanner from "@/components/PrototypeBanner";

export const metadata: Metadata = {
  title: "Virtual Gallery — Public Domain Masterpieces",
  description:
    "A research prototype exploring AI-curated virtual gallery experiences using public domain artworks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050505]">
        <ErrorBoundary>
          <Navbar />
          {children}
          <PrototypeBanner />
        </ErrorBoundary>
      </body>
    </html>
  );
}
