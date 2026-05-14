import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let artworks = [];
  let gallery = null;

  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const [artRes, galRes] = await Promise.all([
      fetch(`${base}/api/artworks?limit=20`).then((r) => r.json()),
      fetch(`${base}/api/gallery`).then((r) => r.json()),
    ]);

    artworks = artRes.data || [];
    gallery = galRes;
  } catch {
    // Fallback to empty — no crash
  }

  return <HomeClient artworks={artworks} gallery={gallery} />;
}
