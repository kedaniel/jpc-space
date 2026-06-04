"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { manualOverrideAction } from "@/lib/attendance-actions";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal";

interface StudentRow {
  userId: number;
  name: string;
  checkedInAt: Date | null;
  status: AttendanceStatus | null;
}

interface CheckInAttendanceListProps {
  sessionId: number;
  students: StudentRow[];
  isOpen: boolean;
}

const statusVariant: Record<
  AttendanceStatus,
  "success" | "warning" | "error" | "info"
> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "error",
  EXCUSED: "info",
};

const ALL_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.ABSENT,
  AttendanceStatus.EXCUSED,
];

export function CheckInAttendanceList({
  sessionId,
  students,
  isOpen,
}: CheckInAttendanceListProps) {
  const router = useRouter();
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [isOpen, router]);

  async function handleOverride(status: AttendanceStatus) {
    if (!editingStudent) return;
    setPending(true);
    await manualOverrideAction(sessionId, {
      studentUserId: editingStudent.userId,
      status,
    });
    setPending(false);
    setEditingStudent(null);
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <p className="py-4 text-center text-sm italic text-muted-foreground">
        No students have scanned yet.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {students.map((student) => (
          <li
            key={student.userId}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {student.name}
              </span>
              {student.checkedInAt && (
                <span className="text-xs text-muted-foreground">
                  {format(student.checkedInAt, "h:mm a")}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {student.status !== null ? (
                <Badge variant={statusVariant[student.status]}>
                  {student.status.charAt(0) +
                    student.status.slice(1).toLowerCase()}
                </Badge>
              ) : (
                <Badge variant="outline">Not recorded</Badge>
              )}
              <Button
                variant="outline"
                size="xs"
                onClick={() => setEditingStudent(student)}
              >
                Edit
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={editingStudent !== null}
        onOpenChange={(open) => {
          if (!open) setEditingStudent(null);
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Override attendance</ModalTitle>
            {editingStudent && (
              <ModalDescription>{editingStudent.name}</ModalDescription>
            )}
          </ModalHeader>
          <div className="grid grid-cols-2 gap-2">
            {ALL_STATUSES.map((status) => (
              <Button
                key={status}
                variant="outline"
                disabled={pending}
                onClick={() => handleOverride(status)}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
