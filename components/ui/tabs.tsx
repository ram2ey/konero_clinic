"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-full sm:w-auto items-center gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/60 p-1 text-muted-foreground shadow-xs scrollbar-none",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 outline-none select-none hover:text-foreground hover:bg-background/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold dark:data-[state=active]:bg-card/90",
        className
      )}
      {...props}
    />
  )
}

// `data-[state=inactive]:hidden` (rather than letting Radix unmount inactive
// panels) is what lets callers pass `forceMount` and keep every tab's data
// fetched once up front instead of re-fetching / re-flashing a skeleton on
// every click — see app/portal/page.tsx and app/admin/page.tsx.
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none data-[state=inactive]:hidden", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
