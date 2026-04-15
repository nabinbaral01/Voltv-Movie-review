"use client";

import { forwardRef } from "react";
import { cn } from "@/utils/formatters";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[#E50914] hover:bg-[#cc0812] text-white shadow-[0_4px_16px_rgba(229,9,20,0.3)] hover:shadow-[0_6px_20px_rgba(229,9,20,0.5)]",
  secondary:
    "bg-white/[0.06] hover:bg-white/[0.10] text-white border border-white/10 hover:border-white/20",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-[#A0A0B0] hover:text-white",
  danger:
    "bg-red-900/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/50",
  gold:
    "bg-[#F5A623] hover:bg-[#e8971e] text-black font-bold shadow-[0_4px_16px_rgba(245,166,35,0.3)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconRight,
      fullWidth,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-lg",
          "transition-all duration-200 cursor-pointer select-none",
          "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner size={size} />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;

function Spinner({ size }: { size: Size }) {
  const s = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <svg className={cn("animate-spin", s)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
