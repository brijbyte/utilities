import type { ButtonHTMLAttributes } from "react";

export type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary hover:bg-primary-hover text-primary-text border-primary hover:border-primary-hover",
  secondary:
    "bg-secondary hover:bg-secondary-hover text-secondary-text border-secondary hover:border-secondary-hover",
  danger:
    "bg-danger hover:bg-danger-hover text-danger-text border-danger hover:border-danger-hover",
  ghost: "bg-transparent hover:bg-bg-hover text-text border-transparent",
  outline: "bg-bg-surface hover:bg-bg-hover text-text border-border",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
}

export function Button({
  variant = "outline",
  active,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const activeClass = active
    ? "bg-accent-subtle border-accent text-accent ring-1 ring-accent/20"
    : "";

  const disabledClass = disabled
    ? "bg-bg-disabled text-text-disabled border-border-disabled pointer-events-none"
    : "";

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs leading-none rounded border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? activeClass : variantClasses[variant]} ${disabledClass} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
