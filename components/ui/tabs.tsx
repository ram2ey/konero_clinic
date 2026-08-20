"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// Detects which edge(s) of a horizontally-scrollable element currently
// have hidden content, so TabsList can hint "there's more here" instead
// of just cutting off with no affordance.
function useScrollEdges<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [edges, setEdges] = React.useState({ left: false, right: false })

  const update = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    })
  }, [])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(el)
    el.addEventListener("scroll", update, { passive: true })
    return () => {
      resizeObserver.disconnect()
      el.removeEventListener("scroll", update)
    }
  }, [update])

  return { ref, edges }
}

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
  const { ref, edges } = useScrollEdges<HTMLDivElement>()

  return (
    <div className="relative min-w-0">
      <TabsPrimitive.List
        ref={ref}
        data-slot="tabs-list"
        className={cn(
          "inline-flex w-full sm:w-auto items-center gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/60 p-1 text-muted-foreground shadow-xs scrollbar-none",
          className
        )}
        {...props}
      />
      {edges.left && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-6 rounded-l-xl bg-gradient-to-r from-muted/90 to-transparent"
        />
      )}
      {edges.right && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-muted/90 to-transparent"
        />
      )}
    </div>
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
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 outline-none select-none hover:text-foreground hover:bg-background/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs data-[state=active]:font-bold data-[state=active]:ring-1 data-[state=active]:ring-primary/25 cursor-pointer",
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
