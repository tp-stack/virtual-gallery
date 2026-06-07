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
  artists,
  activeArtist,
  onArtistChange,
  mediums,
  activeMedium,
  onMediumChange,
  institutions,
  activeInstitution,
  onInstitutionChange,
  yearRange,
  activeYearMin,
  activeYearMax,
  onYearChange,
}: {
  movements: { movement: string; count: number }[];
  activeMovement: string | null;
  onMovementChange: (m: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: string;
  onViewChange: (v: string) => void;
  artists: { artist: string; count: number }[];
  activeArtist: string | null;
  onArtistChange: (a: string | null) => void;
  mediums: { medium: string; count: number }[];
  activeMedium: string | null;
  onMediumChange: (m: string | null) => void;
  institutions: { institution: string; count: number }[];
  activeInstitution: string | null;
  onInstitutionChange: (i: string | null) => void;
  yearRange: { min: number; max: number };
  activeYearMin: number | null;
  activeYearMax: number | null;
  onYearChange: (min: number | null, max: number | null) => void;
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showMovements, setShowMovements] = useState(false);
  const [showArtists, setShowArtists] = useState(false);
  const [showMediums, setShowMediums] = useState(false);
  const [showInstitutions, setShowInstitutions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [yearMinInput, setYearMinInput] = useState(activeYearMin ? String(activeYearMin) : "");
  const [yearMaxInput, setYearMaxInput] = useState(activeYearMax ? String(activeYearMax) : "");

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setYearMinInput(activeYearMin ? String(activeYearMin) : "");
  }, [activeYearMin]);

  useEffect(() => {
    setYearMaxInput(activeYearMax ? String(activeYearMax) : "");
  }, [activeYearMax]);

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

  const activeFilters = [
    activeMovement && "Movement",
    activeArtist && "Artist",
    activeMedium && "Medium",
    activeInstitution && "Institution",
    activeYearMin || activeYearMax ? "Period" : null,
  ].filter(Boolean).length;

  const clearAll = () => {
    onMovementChange(null);
    onArtistChange(null);
    onMediumChange(null);
    onInstitutionChange(null);
    onYearChange(null, null);
  };

  return (
    <div className="space-y-5">
      {/* Search + View toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input
            type="text"
            placeholder="Search by title, artist, institution..."
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

      {/* Filter dropdowns row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Movement dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowMovements(!showMovements); setShowArtists(false); setShowMediums(false); setShowInstitutions(false); }}
            className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border transition-all duration-500 font-light flex items-center gap-1.5 ${
              activeMovement ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/5" : "border-[#232323] text-[#B8B2A4] hover:border-[#555]"
            }`}
          >
            {activeMovement || "Movement"}
            <span className="text-[#555] text-[9px]">▾</span>
          </button>
          {showMovements && (
            <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] max-h-48 overflow-y-auto rounded-[12px] bg-[#0D0D0D] border border-[#232323] p-1.5 shadow-2xl">
              <button
                onClick={() => { onMovementChange(null); setShowMovements(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                  !activeMovement ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                }`}
              >
                All Movements
              </button>
              {movements.map((m) => (
                <button
                  key={m.movement}
                  onClick={() => { onMovementChange(m.movement); setShowMovements(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                    activeMovement === m.movement ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                  }`}
                >
                  {m.movement}
                  <span className="ml-1.5 text-[#555]">({m.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Artist dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowArtists(!showArtists); setShowMovements(false); setShowMediums(false); setShowInstitutions(false); }}
            className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border transition-all duration-500 font-light flex items-center gap-1.5 ${
              activeArtist ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/5" : "border-[#232323] text-[#B8B2A4] hover:border-[#555]"
            }`}
          >
            {activeArtist || "Artist"}
            <span className="text-[#555] text-[9px]">▾</span>
          </button>
          {showArtists && (
            <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] max-h-48 overflow-y-auto rounded-[12px] bg-[#0D0D0D] border border-[#232323] p-1.5 shadow-2xl">
              <button
                onClick={() => { onArtistChange(null); setShowArtists(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                  !activeArtist ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                }`}
              >
                All Artists
              </button>
              {artists.map((a) => (
                <button
                  key={a.artist}
                  onClick={() => { onArtistChange(a.artist); setShowArtists(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                    activeArtist === a.artist ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                  }`}
                >
                  {a.artist.length > 30 ? a.artist.slice(0, 30) + "..." : a.artist}
                  <span className="ml-1.5 text-[#555]">({a.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Medium/Style dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowMediums(!showMediums); setShowMovements(false); setShowArtists(false); setShowInstitutions(false); }}
            className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border transition-all duration-500 font-light flex items-center gap-1.5 ${
              activeMedium ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/5" : "border-[#232323] text-[#B8B2A4] hover:border-[#555]"
            }`}
          >
            {activeMedium || "Medium"}
            <span className="text-[#555] text-[9px]">▾</span>
          </button>
          {showMediums && (
            <div className="absolute top-full left-0 mt-1 z-20 min-w-[200px] max-h-48 overflow-y-auto rounded-[12px] bg-[#0D0D0D] border border-[#232323] p-1.5 shadow-2xl">
              <button
                onClick={() => { onMediumChange(null); setShowMediums(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                  !activeMedium ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                }`}
              >
                All Mediums
              </button>
              {mediums.map((m) => (
                <button
                  key={m.medium}
                  onClick={() => { onMediumChange(m.medium); setShowMediums(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                    activeMedium === m.medium ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                  }`}
                >
                  {m.medium.length > 35 ? m.medium.slice(0, 35) + "..." : m.medium}
                  <span className="ml-1.5 text-[#555]">({m.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Institution dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowInstitutions(!showInstitutions); setShowMovements(false); setShowArtists(false); setShowMediums(false); }}
            className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border transition-all duration-500 font-light flex items-center gap-1.5 ${
              activeInstitution ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/5" : "border-[#232323] text-[#B8B2A4] hover:border-[#555]"
            }`}
          >
            {activeInstitution || "Institution"}
            <span className="text-[#555] text-[9px]">▾</span>
          </button>
          {showInstitutions && (
            <div className="absolute top-full left-0 mt-1 z-20 min-w-[240px] max-h-56 overflow-y-auto rounded-[12px] bg-[#0D0D0D] border border-[#232323] p-1.5 shadow-2xl">
              <button
                onClick={() => { onInstitutionChange(null); setShowInstitutions(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                  !activeInstitution ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                }`}
              >
                All Institutions
              </button>
              {institutions.map((institution) => (
                <button
                  key={institution.institution}
                  onClick={() => { onInstitutionChange(institution.institution); setShowInstitutions(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] rounded-lg transition-all ${
                    activeInstitution === institution.institution ? "text-[#C8A96A] bg-[#C8A96A]/5" : "text-[#B8B2A4] hover:bg-[#111]"
                  }`}
                >
                  {institution.institution.length > 38 ? institution.institution.slice(0, 38) + "..." : institution.institution}
                  <span className="ml-1.5 text-[#555]">({institution.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Period (year range) */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={String(yearRange.min)}
            value={yearMinInput}
            onChange={(e) => setYearMinInput(e.target.value)}
            onBlur={() => onYearChange(yearMinInput ? parseInt(yearMinInput) : null, activeYearMax)}
            onKeyDown={(e) => { if (e.key === "Enter") onYearChange(yearMinInput ? parseInt(yearMinInput) : null, activeYearMax); }}
            className="w-[80px] px-3 py-2 rounded-full bg-[#0D0D0D] border border-[#232323] text-[#F5F2EA] placeholder-[#555] focus:outline-none focus:border-[#C8A96A]/30 text-[11px] font-light text-center"
          />
          <span className="text-[#555] text-[10px]">–</span>
          <input
            type="number"
            placeholder={String(yearRange.max)}
            value={yearMaxInput}
            onChange={(e) => setYearMaxInput(e.target.value)}
            onBlur={() => onYearChange(activeYearMin, yearMaxInput ? parseInt(yearMaxInput) : null)}
            onKeyDown={(e) => { if (e.key === "Enter") onYearChange(activeYearMin, yearMaxInput ? parseInt(yearMaxInput) : null); }}
            className="w-[80px] px-3 py-2 rounded-full bg-[#0D0D0D] border border-[#232323] text-[#F5F2EA] placeholder-[#555] focus:outline-none focus:border-[#C8A96A]/30 text-[11px] font-light text-center"
          />
        </div>

        {/* Clear all */}
        {activeFilters > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-2 text-[10px] tracking-[0.12em] uppercase rounded-full border border-[#C8A96A]/20 text-[#C8A96A]/60 hover:text-[#C8A96A] hover:border-[#C8A96A]/40 transition-all duration-500 font-light"
          >
            Clear ({activeFilters})
          </button>
        )}
      </div>
    </div>
  );
}
