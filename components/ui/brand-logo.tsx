import * as React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
  subtitle?: string;
  showSubtitle?: boolean;
  showEmblem?: boolean;
  collapseTextOnSidebar?: boolean;
}

export function BrandLogo({
  size = "default",
  subtitle,
  showSubtitle = true,
  showEmblem = true,
  collapseTextOnSidebar = false,
  className,
  ...props
}: BrandLogoProps) {
  const emblemSizes = {
    sm: "size-7 text-xs rounded-lg",
    default: "size-9 text-xs font-bold rounded-xl",
    lg: "size-12 text-sm font-extrabold rounded-2xl",
  };

  const titleSizes = {
    sm: "text-sm font-semibold tracking-tight",
    default: "text-base font-bold tracking-tight",
    lg: "text-xl font-extrabold tracking-tight",
  };

  const subtitleSizes = {
    sm: "text-[10px]",
    default: "text-xs",
    lg: "text-xs",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 select-none",
        className
      )}
      {...props}
    >
      {showEmblem && (
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center bg-gradient-to-br from-violet-600 via-primary to-indigo-700 text-primary-foreground font-sans shadow-md shadow-primary/25 ring-1 ring-white/30",
            emblemSizes[size]
          )}
          aria-hidden="true"
        >
          <span className="font-extrabold tracking-wider bg-gradient-to-br from-white via-violet-100 to-amber-200 bg-clip-text text-transparent">
            AVK
          </span>
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-brand-gold ring-1 ring-background shadow-2xs" />
        </div>
      )}

      <div
        className={cn(
          "min-w-0 flex flex-col justify-center leading-none",
          collapseTextOnSidebar && "group-data-[collapsible=icon]:hidden"
        )}
      >
        <div className={cn("flex items-baseline gap-1", titleSizes[size])}>
          <span className="text-primary font-bold text-[0.85em]">Dr.</span>
          <span className="bg-gradient-to-r from-foreground via-foreground to-primary/90 bg-clip-text font-extrabold text-foreground">
            Alex Vico-Korda
          </span>
        </div>
        {showSubtitle && subtitle && (
          <p className={cn("text-muted-foreground font-medium mt-0.5 truncate tracking-normal", subtitleSizes[size])}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
