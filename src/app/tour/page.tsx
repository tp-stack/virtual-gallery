import dynamic from "next/dynamic";

const TourShell = dynamic(() => import("../../components/TourShell"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-64 h-px bg-[#232323] relative overflow-hidden">
        <div className="absolute inset-0 gold-line-move" style={{ width: "0%" }} />
      </div>
    </div>
  ),
});

export default function TourPage() {
  return <TourShell />;
}
