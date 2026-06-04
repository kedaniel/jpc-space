"use client";

import { useEffect, useRef } from "react";
import QrScanner from "qr-scanner";

interface QrScannerViewProps {
  onScan: (data: string) => void;
  onError?: (err: Error) => void;
  active: boolean;
}

export function QrScannerView({ onScan, onError, active }: QrScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    if (!videoRef.current || !active) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => onScanRef.current(result.data),
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        onDecodeError: () => {},
      },
    );

    const startPromise = scanner.start().catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      onErrorRef.current?.(error);
    });

    return () => {
      void startPromise.finally(() => {
        scanner.stop();
        scanner.destroy();
      });
    };
  }, [active]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} className="aspect-video w-full" aria-hidden="true" />
    </div>
  );
}
