import { Badge } from "@/components/ui/badge";
import { SeasonStatus } from "@/generated/prisma/enums";

const variantFor: Record<SeasonStatus, "success" | "info" | "default" | "warning"> = {
  [SeasonStatus.DRAFT]: "default",
  [SeasonStatus.ACTIVE]: "success",
  [SeasonStatus.COMPLETED]: "info",
  [SeasonStatus.ARCHIVED]: "warning",
};

const labelFor: Record<SeasonStatus, string> = {
  [SeasonStatus.DRAFT]: "Draft",
  [SeasonStatus.ACTIVE]: "Active",
  [SeasonStatus.COMPLETED]: "Completed",
  [SeasonStatus.ARCHIVED]: "Archived",
};

export function SeasonStatusBadge({ status }: { status: SeasonStatus }) {
  return <Badge variant={variantFor[status]}>{labelFor[status]}</Badge>;
}
