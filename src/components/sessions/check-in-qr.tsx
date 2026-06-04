"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CheckInQrProps {
  url: string;
  sessionId: number;
}

export function CheckInQr({ url, sessionId }: CheckInQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 2,
        color: { dark: "#0a1628", light: "#ffffff" },
      });
    }
  }, [url]);

  const handleDownload = async () => {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 800,
      margin: 2,
      color: { dark: "#0a1628", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `session-${sessionId}-checkin.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="rounded-xl border border-border/60 p-2"
      />
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download />
        Download QR
      </Button>
    </div>
  );
}
