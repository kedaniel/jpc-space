import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  variant?: "white" | "navy" | "teal";
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  variant = "white",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4",
        variant === "white" &&
          "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60",
        variant === "navy" &&
          "bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 shadow-[0_4px_20px_rgba(31,50,96,0.25)]",
        variant === "teal" &&
          "bg-brand-teal-100 ring-1 ring-brand-teal-200",
        className,
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          variant === "white" && "text-neutral-400",
          variant === "navy" && "text-brand-teal-300",
          variant === "teal" && "text-brand-teal-700",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-3xl font-black",
          variant === "white" && "text-brand-navy-900",
          variant === "navy" && "text-white",
          variant === "teal" && "text-brand-teal-900",
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p
          className={cn(
            "mt-0.5 text-[10px]",
            variant === "white" && "text-neutral-400",
            variant === "navy" && "text-white/40",
            variant === "teal" && "text-brand-teal-600",
          )}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}
