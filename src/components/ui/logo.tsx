import Image from "next/image";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

const SIZES = {
  sm: { px: 28, box: "size-7", wordmark: "text-base" },
  md: { px: 36, box: "size-9", wordmark: "text-lg" },
  lg: { px: 64, box: "size-16", wordmark: "text-2xl" },
} as const;

export function Logo({
  size = "md",
  showWordmark = false,
  className,
  wordmarkClassName,
}: LogoProps) {
  const dims = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10",
          dims.box,
        )}
        aria-hidden={showWordmark ? undefined : false}
      >
        <Image
          src="/jpc-logo.jpg"
          alt={showWordmark ? "JPC Space logo" : "JPC Space"}
          width={dims.px}
          height={dims.px}
          priority={size === "lg"}
          className="h-full w-full object-cover"
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-sans font-semibold tracking-tight",
            dims.wordmark,
            wordmarkClassName,
          )}
        >
          JPC Space
        </span>
      ) : null}
    </span>
  );
}
