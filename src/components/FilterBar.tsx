"use client";

import { Search, Grid3X3, Columns, List } from "lucide-react";

export default function FilterBar({
  movements, activeMovement, onMovementChange,
  searchQuery, onSearchChange, viewMode, onViewChange,
}: {
  movements: { movement: string; count: number }[];
  activeMovement: string | null;
  onMovementChange: (m: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: string;
  onViewChange: (v: string) => void;
}) {
  const viewIcons: Record<string, React.ReactNode> = {
    masonry: <Columns className="w-4 h-4" />,
    grid: <Grid3X3 className="w-4 h-4" />,
    list: <List className="w-4 h-4" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gallery-400" />
          <input type="text" placeholder="Search artworks, artists, movements..."
            value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gallery-800 border border-gallery-700 text-gallery-100 placeholder-gallery-500 focus:outline-none focus:border-gold-500/50 transition-colors text-sm" />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-gallery-800 border border-gallery-700">
          {Object.entries(viewIcons).map(([mode, icon]) => (
            <button key={mode} onClick={() => onViewChange(mode)}
              className={`p-2 rounded-lg transition-all ${viewMode === mode ? "bg-gold-500/20 text-gold-400" : "text-gallery-400 hover:text-gallery-200"}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onMovementChange(null)}
          className={`px-3 py-1.5 text-xs rounded-full border transition-all ${!activeMovement ? "border-gold-500 text-gold-400 bg-gold-500/10" : "border-gallery-600 text-gallery-400 hover:border-gallery-400"}`}>
          All
        </button>
        {movements.map((m) => (
          <button key={m.movement} onClick={() => onMovementChange(m.movement)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all whitespace-nowrap ${activeMovement === m.movement ? "border-gold-500 text-gold-400 bg-gold-500/10" : "border-gallery-600 text-gallery-400 hover:border-gallery-400"}`}>
            {m.movement} ({m.count})
          </button>
        ))}
      </div>
    </div>
  );
}
