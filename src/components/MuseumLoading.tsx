"use client";

import { useState, useEffect } from "react";

const STAGES = [
  { key: "webgl", label: "Initializing museum..." },
  { key: "physics", label: "Loading physics engine..." },
  { key: "data", label: "Preparing gallery..." },
  { key: "ready", label: "Entering..." },
];

export default function MuseumLoading() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (stageIndex >= STAGES.length - 1) return;
    const t = setTimeout(() => setStageIndex((i) => i + 1), 2000);
    return () => clearTimeout(t);
  }, [stageIndex]);

  const progress = ((stageIndex) / (STAGES.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center">
      {/* Gold charge line */}
      <div className="w-64 md:w-96 h-px bg-[#232323] relative overflow-hidden mb-6">
        <div
          className="absolute inset-0 gold-line-move"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage label */}
      <p className="text-[#B8B2A4] text-xs tracking-[0.12em] font-light uppercase">
        {STAGES[stageIndex].label}
      </p>
    </div>
  );
}
