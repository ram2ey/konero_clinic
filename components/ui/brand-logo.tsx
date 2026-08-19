import * as React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
  subtitle?: string;
  showSubtitle?: boolean;
  collapseTextOnSidebar?: boolean;
}

export function BrandLogo({
  size = "default",
  subtitle,
  showSubtitle = true,
  collapseTextOnSidebar = false,
  className,
  ...props
}: BrandLogoProps) {
  const titleSizes = {
    sm: "text-sm font-semibold tracking-tight",
    default: "text-base font-bold tracking-tight",
    lg: "text-2xl font-extrabold tracking-tight",
  };

  const subtitleSizes = {
    sm: "text-[10px]",
    default: "text-xs",
    lg: "text-xs sm:text-sm",
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-center leading-none select-none",
        collapseTextOnSidebar && "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    >
      <div className={cn("flex items-baseline gap-1.5", titleSizes[size])}>
        <span className="text-primary font-bold text-[0.88em]">Dr.</span>
        <span className="bg-gradient-to-r from-foreground via-foreground to-primary/90 bg-clip-text font-extrabold text-foreground">
          Alex Vico-Korda
        </span>
      </div>
      {showSubtitle && subtitle && (
        <p className={cn("text-muted-foreground font-medium mt-1 truncate tracking-normal", subtitleSizes[size])}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
