import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  badge?: string | number;
  active?: boolean;
}

export function PlayerChip({
  label,
  badge,
  active = false,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={[
        "tap-target focus-ring rounded-full px-4 py-2 text-sm font-medium transition-colors",
        "border",
        active
          ? "bg-bar-amber text-black border-bar-amber"
          : "bg-bar-panel2 text-bar-ink border-bar-line hover:bg-bar-line",
        className,
      ].join(" ")}
    >
      {label}
      {badge != null && (
        <span
          className={[
            "ml-2 inline-flex items-center justify-center rounded-full px-2 text-xs font-semibold",
            active ? "bg-black/20 text-black" : "bg-bar-amber/20 text-bar-amber",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
