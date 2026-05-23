"use client";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";

export function ModalDemo() {
  return (
    <Modal>
      <ModalTrigger render={<Button>Open modal</Button>} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Confirm action</ModalTitle>
          <ModalDescription>
            On mobile this slides up as a bottom sheet; on md+ it appears
            centered.
          </ModalDescription>
        </ModalHeader>
        <p className="text-sm text-muted-foreground">
          Body content goes here — any form, table, or description.
        </p>
        <ModalFooter>
          <ModalClose render={<Button variant="ghost">Cancel</Button>} />
          <ModalClose render={<Button>Confirm</Button>} />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
