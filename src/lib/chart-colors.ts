// Hex values mirrored from src/app/globals.css @theme block. Keep in sync if tokens change.
// Recharts takes string fills, so we resolve token names to hex here in one place.

export const chartColors = {
  brandNavy: {
    300: "#8C9FC6",
    500: "#4A639B",
    700: "#324D87",
    900: "#22355F",
  },
  brandTeal: {
    300: "#A6E0E2",
    500: "#67CBCD",
    700: "#3A9698",
  },
  success: { 500: "#10B981", 700: "#047857" },
  warning: { 500: "#F59E0B", 700: "#B45309" },
  error: { 500: "#EF4444", 700: "#B91C1C" },
  info: { 500: "#3B82F6", 700: "#1D4ED8" },
  neutral: {
    200: "#E5E7EB",
    400: "#9CA3AF",
    600: "#4B5563",
    900: "#111827",
  },
} as const;

// Ordered palette for categorical charts (engagement buckets, etc.)
export const categoricalPalette = [
  chartColors.success[500],
  chartColors.brandTeal[500],
  chartColors.warning[500],
  chartColors.error[500],
  chartColors.brandNavy[500],
];
