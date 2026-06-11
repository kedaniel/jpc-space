"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal";

const QrScannerView = dynamic(
  () => import("@/components/sessions/qr-scanner-view").then((m) => m.QrScannerView),
  { ssr: false },
);

interface StudentCheckinButtonProps {
  isCheckInOpen: boolean;
}

function extractCheckinPath(scanned: string): string | null {
  try {
    const url = new URL(scanned);
    const match = /^\/checkin\/([^/]+)$/.exec(url.pathname);
    if (match && url.origin === window.location.origin) {
      return url.pathname;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function StudentCheckinButton({ isCheckInOpen }: StudentCheckinButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  function handleScan(data: string) {
    const path = extractCheckinPath(data);
    if (path) {
      router.push(path);
    } else {
      setScanError("That doesn't look like a check-in code");
    }
  }

  function handleOpen() {
    setScanError(null);
    setOpen(true);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        size="lg"
        disabled={!isCheckInOpen}
        onClick={isCheckInOpen ? handleOpen : undefined}
        className="w-full min-h-[44px]"
      >
        <QrCode />
        Check In
      </Button>
      {!isCheckInOpen && (
        <p className="text-sm text-neutral-500">Check-in hasn&apos;t opened yet</p>
      )}

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Scan check-in code</ModalTitle>
            <ModalDescription>
              Point your camera at the QR code displayed by your leader.
            </ModalDescription>
          </ModalHeader>

          <QrScannerView onScan={handleScan} active={open} />

          {scanError && (
            <p className="text-sm text-error-600 dark:text-error-400">{scanError}</p>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
