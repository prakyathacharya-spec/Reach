import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const base = "px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-signal text-paper hover:bg-signal/90"
      : "bg-transparent text-ink border border-line hover:border-ink";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}
