import dynamic from "next/dynamic";

const GalleryWorld = dynamic(() => import("../../components/GalleryWorld"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="w-px h-16 bg-[#C8A96A]/40 mx-auto mb-8" />
        <p className="text-[#B8B2A4] text-sm tracking-[0.08em] font-light">Loading museum environment...</p>
      </div>
    </div>
  ),
});

export default function TourPage() {
  return <GalleryWorld />;
}
