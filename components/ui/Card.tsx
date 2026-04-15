import { cn } from "@/utils/formatters";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  glass?: boolean;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  elevated,
  glass,
  hover,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  const paddings = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

  return (
    <div
      className={cn(
        "rounded-[12px] border transition-all duration-300",
        elevated
          ? "bg-[#1A1A28] border-white/[0.06]"
          : glass
          ? "bg-white/[0.04] backdrop-blur-[12px] border-white/[0.08]"
          : "bg-[#12121A] border-[#1E1E2E]",
        hover && "hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
