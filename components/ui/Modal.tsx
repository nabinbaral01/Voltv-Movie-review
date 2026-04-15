"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/utils/formatters";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}

const sizeMap = {
  sm:   "max-w-sm",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-[95vw] h-[90vh]",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  className,
  hideClose,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] animate-fade-in" />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full glass-strong rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]",
          "animate-scale-in overflow-hidden flex flex-col",
          sizeMap[size],
          size === "full" && "overflow-y-auto",
          className
        )}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-start justify-between p-5 border-b border-white/[0.06] shrink-0">
            <div>
              {title && (
                <h2 className="text-lg font-bold text-white">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-[#A0A0B0] mt-0.5">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#505060] hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={cn("flex-1", size !== "full" && "overflow-y-auto")}>
          {children}
        </div>
      </div>
    </div>
  );
}
