import dynamic from "next/dynamic";

const GalleryWorld = dynamic(() => import("../../components/GalleryWorld"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-gallery-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gallery-100 text-xl font-display">Loading Museum Environment...</p>
      </div>
    </div>
  ),
});

export default function TourPage() {
  return <GalleryWorld />;
}
