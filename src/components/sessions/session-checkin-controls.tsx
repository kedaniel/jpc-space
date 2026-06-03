"use client";

import { useTransition } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";

import {
  openCheckInAction,
  closeCheckInAction,
} from "@/lib/session-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { CheckInQr } from "@/components/sessions/check-in-qr";

interface SessionCheckInControlsProps {
  sessionId: number;
  isOpen: boolean;
  checkInUrl: string | null;
}

export function SessionCheckInControls({
  sessionId,
  isOpen,
  checkInUrl,
}: SessionCheckInControlsProps) {
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    startTransition(async () => {
      try {
        const result = await openCheckInAction(sessionId);
        if (!result.ok) toast.error(result.error);
      } catch {
        toast.error("Failed to open check-in. Please try again.");
      }
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      try {
        const result = await closeCheckInAction(sessionId);
        if (!result.ok) toast.error(result.error);
      } catch {
        toast.error("Failed to close check-in. Please try again.");
      }
    });
  };

  if (isOpen && checkInUrl) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">Check-in open</Badge>
        <Modal>
          <ModalTrigger render={
            <Button variant="outline" size="sm" disabled={isPending}>
              <QrCode className="size-4" />
              Show QR
            </Button>
          } />
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Check-in QR Code</ModalTitle>
            </ModalHeader>
            <CheckInQr url={checkInUrl} sessionId={sessionId} />
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleClose}
            >
              Close check-in
            </Button>
          </ModalContent>
        </Modal>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleOpen}
    >
      <QrCode className="size-4" />
      {isPending ? "Opening…" : "Open check-in"}
    </Button>
  );
}
