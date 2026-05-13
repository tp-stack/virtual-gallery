"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import MuseumLoading from "./MuseumLoading";
import MuseumError from "./MuseumError";

const GalleryWorld = dynamic(() => import("./GalleryWorld"), { ssr: false });

type Status = "loading" | "error" | "ready";

function checkWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("webgl2"));
  } catch {
    return false;
  }
}

export default function TourShell() {
  const [status, setStatus] = useState<Status>("loading");
  const [mount3D, setMount3D] = useState(false);
  const [diagnostics, setDiagnostics] = useState([
    { label: "WebGL", ok: false },
    { label: "Physics Engine", ok: false },
    { label: "Gallery Data", ok: false },
  ]);

  useEffect(() => {
    const webglOk = checkWebGL();
    setDiagnostics((prev) =>
      prev.map((d) => (d.label === "WebGL" ? { ...d, ok: webglOk } : d))
    );

    if (!webglOk) {
      setStatus("error");
      return;
    }

    // Simulate physics load
    const physicsTimer = setTimeout(() => {
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.label === "Physics Engine" ? { ...d, ok: true } : d
        )
      );
    }, 1500);

    // Fetch gallery data to verify API works
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => {
        setDiagnostics((prev) =>
          prev.map((d) =>
            d.label === "Gallery Data" ? { ...d, ok: true } : d
          )
        );
      })
      .catch(() => {
        // API failed — still try to mount, just mark diagnostic
      });

    // Mount 3D after loading phase
    const mountTimer = setTimeout(() => {
      setMount3D(true);
      setStatus("ready");
    }, 3000);

    return () => {
      clearTimeout(physicsTimer);
      clearTimeout(mountTimer);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setMount3D(false);
    setDiagnostics([
      { label: "WebGL", ok: false },
      { label: "Physics Engine", ok: false },
      { label: "Gallery Data", ok: false },
    ]);
    // Re-run the effect by forcing remount
    window.location.reload();
  }, []);

  const handleError = useCallback(() => {
    setStatus("error");
  }, []);

  if (status === "error") {
    return <MuseumError diagnostics={diagnostics} onRetry={handleRetry} />;
  }

  if (status === "loading") {
    return <MuseumLoading />;
  }

  if (!mount3D) {
    return <MuseumLoading />;
  }

  return (
    <div className="w-screen h-screen relative">
      {mount3D && (
        <ErrorBoundaryBridge onError={handleError}>
          <GalleryWorld />
        </ErrorBoundaryBridge>
      )}
    </div>
  );
}

// Inline error boundary to catch 3D failures
import { Component, ErrorInfo, ReactNode } from "react";

class ErrorBoundaryBridge extends Component<{
  children: ReactNode;
  onError: () => void;
}> {
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[3D Error]", error, info.componentStack);
    this.props.onError();
  }

  render() {
    return this.props.children;
  }
}
