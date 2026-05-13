"use client";

interface Props {
  diagnostics?: { label: string; ok: boolean }[];
  onRetry: () => void;
}

const DEFAULT_DIAGNOSTICS = [
  { label: "WebGL", ok: false },
  { label: "Physics Engine", ok: false },
  { label: "Gallery Data", ok: false },
];

export default function MuseumError({ diagnostics, onRetry }: Props) {
  const items = diagnostics || DEFAULT_DIAGNOSTICS;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-12 h-12 mx-auto mb-8 rounded-full border border-[#C8A96A]/30 flex items-center justify-center">
          <span className="text-[#C8A96A] text-lg font-light">⚠</span>
        </div>

        <h1 className="text-[#F5F2EA] text-2xl font-light mb-4 tracking-[-0.02em]">
          Museum Temporarily Unavailable
        </h1>
        <p className="text-[#B8B2A4] text-sm font-light mb-8 leading-relaxed tracking-wide">
          The 3D environment could not initialize. Some gallery features may be
          unavailable in your current browser or device.
        </p>

        {/* Diagnostics */}
        <div className="rounded-[12px] bg-[#161616] border border-[#232323] p-4 mb-8 text-left">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <span className="text-[#B8B2A4] font-light text-xs tracking-[0.08em]">
                {item.label}
              </span>
              <span
                className={`text-xs font-light ${
                  item.ok ? "text-[#8FA3B8]" : "text-[#C8A96A]"
                }`}
              >
                {item.ok ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-8 py-3 bg-[#F5F2EA] text-[#050505] font-medium text-xs tracking-[0.08em] uppercase rounded-[12px] hover:bg-[#E6E6E6] transition-all duration-500"
          >
            Retry
          </button>
          <a
            href="/gallery"
            className="px-8 py-3 border border-[#232323] text-[#B8B2A4] font-light text-xs tracking-[0.08em] uppercase rounded-[12px] hover:border-[#C8A96A] hover:text-[#F5F2EA] transition-all duration-500 text-center"
          >
            Browse Collection
          </a>
        </div>
      </div>
    </div>
  );
}
