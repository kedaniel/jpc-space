"use client";

import { useEffect, useRef } from "react";
import QrScanner from "qr-scanner";

interface QrScannerViewProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QrScannerView({ onScan, active }: QrScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Stable ref so the effect doesn't restart when onScan identity changes
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!videoRef.current || !active) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => onScanRef.current(result.data),
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    scanner.start();

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [active]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} className="w-full" />
    </div>
  );
}
