import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-bar-amber text-black hover:bg-bar-amber/90 disabled:bg-bar-amber/30 disabled:text-black/60",
  secondary:
    "bg-bar-panel2 text-bar-ink border border-bar-line hover:bg-bar-line/70 disabled:opacity-50",
  ghost:
    "bg-transparent text-bar-ink/80 hover:text-bar-ink hover:bg-bar-panel2 disabled:opacity-50",
  danger:
    "bg-bar-emberDeep text-bar-ink hover:bg-bar-ember disabled:opacity-50",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={[
        "tap-target focus-ring rounded-2xl px-5 py-3 font-semibold transition-colors",
        "disabled:cursor-not-allowed",
        fullWidth ? "w-full" : "",
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl bg-bar-panel border border-bar-line p-4",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function Heading({
  children,
  level = 1,
  className = "",
}: {
  children: ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}) {
  const cls = [
    level === 1 ? "text-3xl" : level === 2 ? "text-xl" : "text-base",
    "font-semibold tracking-tight text-bar-ink",
    className,
  ].join(" ");
  if (level === 1) return <h1 className={cls}>{children}</h1>;
  if (level === 2) return <h2 className={cls}>{children}</h2>;
  return <h3 className={cls}>{children}</h3>;
}

export function Subtle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={["text-sm text-bar-mute", className].join(" ")}>{children}</p>
  );
}

export function ScreenShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-[100svh] flex flex-col bg-bar-bg">
      <div className="flex-1 flex flex-col gap-4 p-4 max-w-md w-full mx-auto pb-32">
        {children}
      </div>
      {footer ? (
        <div className="sticky bottom-0 left-0 right-0 bg-bar-bg/95 backdrop-blur border-t border-bar-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-2 max-w-md w-full mx-auto">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
