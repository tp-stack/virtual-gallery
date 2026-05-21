"use client";

export default function PrototypeBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-[1440px] mx-auto px-8 pb-4 flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#050505]/80 backdrop-blur-md border border-[#C8A96A]/20 pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96A]/60" />
          <span className="text-[#B8B2A4] text-[10px] tracking-[0.12em] font-light uppercase">
            Controlled Prototype — Demo Sandbox
          </span>
        </div>
      </div>
    </div>
  );
}
