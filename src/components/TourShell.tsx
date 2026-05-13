"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import MuseumLoading from "./MuseumLoading";
import MuseumError from "./MuseumError";
import PortalEntrance from "./PortalEntrance";

const GalleryWorld = dynamic(() => import("./GalleryWorld"), { ssr: false });

type Status = "loading" | "portal" | "error" | "ready";

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

    const physicsTimer = setTimeout(() => {
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.label === "Physics Engine" ? { ...d, ok: true } : d
        )
      );
    }, 1500);

    fetch("/api/gallery")
      .then((r) => r.json())
      .then(() => {
        setDiagnostics((prev) =>
          prev.map((d) =>
            d.label === "Gallery Data" ? { ...d, ok: true } : d
          )
        );
      })
      .catch(() => {});

    const mountTimer = setTimeout(() => {
      setStatus("portal");
    }, 3000);

    return () => {
      clearTimeout(physicsTimer);
      clearTimeout(mountTimer);
    };
  }, []);

  const handlePortalComplete = useCallback(() => {
    setStatus("ready");
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handle3DError = useCallback(() => {
    setStatus("error");
  }, []);

  if (status === "error") {
    return <MuseumError diagnostics={diagnostics} onRetry={handleRetry} />;
  }

  if (status === "loading") {
    return <MuseumLoading />;
  }

  if (status === "portal") {
    return <PortalEntrance onComplete={handlePortalComplete} />;
  }

  return (
    <div className="w-screen h-screen relative">
      <ErrorBoundaryBridge onError={handle3DError}>
        <GalleryWorld />
      </ErrorBoundaryBridge>
    </div>
  );
}

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
