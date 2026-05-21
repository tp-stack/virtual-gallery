"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Grid3X3, Columns, List } from "lucide-react";

export default function FilterBar({
  movements,
  activeMovement,
  onMovementChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewChange,
}: {
  movements: { movement: string; count: number }[];
  activeMovement: string | null;
  onMovementChange: (m: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: string;
  onViewChange: (v: string) => void;
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = (value: string) => {
    setLocalSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearchChange(value), 300);
  };

  const viewIcons: Record<string, React.ReactNode> = {
    masonry: <Columns className="w-3.5 h-3.5" />,
    grid: <Grid3X3 className="w-3.5 h-3.5" />,
    list: <List className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input
            type="text"
            placeholder="Search by title, artist, movement..."
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-[12px] bg-[#0D0D0D] border border-[#232323] text-[#F5F2EA] placeholder-[#555] focus:outline-none focus:border-[#C8A96A]/30 transition-all duration-500 text-sm font-light"
          />
        </div>

        <div className="flex gap-1 p-1 rounded-[12px] bg-[#0D0D0D] border border-[#232323]">
          {Object.entries(viewIcons).map(([mode, icon]) => (
            <button
              key={mode}
              onClick={() => onViewChange(mode)}
              className={`p-2 rounded-lg transition-all duration-300 ${
                viewMode === mode
                  ? "bg-[#C8A96A]/10 text-[#C8A96A]"
                  : "text-[#555] hover:text-[#B8B2A4]"
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onMovementChange(null)}
          className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border transition-all duration-500 font-light ${
            !activeMovement
              ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/5"
              : "border-[#232323] text-[#B8B2A4] hover:border-[#555]"
          }`}
        >
          All
        </button>
        {movements.map((m) => (
          <button
            key={m.movement}
            onClick={() => onMovementChange(m.movement)}
            className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border transition-all duration-500 font-light whitespace-nowrap ${
              activeMovement === m.movement
                ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/5"
                : "border-[#232323] text-[#B8B2A4] hover:border-[#555]"
            }`}
          >
            {m.movement}
            <span className="ml-1.5 text-[#555]">({m.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
