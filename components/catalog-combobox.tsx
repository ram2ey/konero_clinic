"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { CatalogMatch } from "@/lib/catalog-search";
import { inputClass } from "@/lib/form-ui";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

type CatalogSearchResult = {
  status: "idle" | "success" | "error";
  message?: string;
  results?: CatalogMatch[];
};

/**
 * Type-ahead over one of the reference catalogues (ICD-11 diagnoses,
 * medications, lab tests). The `search` prop is the Server Action to call
 * — passing a Server Action down as a prop is fine, it is a reference the
 * client can invoke.
 *
 * Free text is always preserved: `onTextChange` fires on every keystroke
 * and picking from the list is optional, so a diagnosis, medicine or test
 * that isn't in the catalogue can still simply be typed.
 *
 * The dropdown renders through a portal because this control sits inside
 * accordion sections with their own overflow/stacking contexts, which
 * would otherwise clip it.
 */
export function CatalogCombobox({
  value,
  onSelect,
  onTextChange,
  search,
  disabled,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onSelect: (match: CatalogMatch) => void;
  onTextChange: (value: string) => void;
  search: (input: { query: string }) => Promise<CatalogSearchResult>;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [results, setResults] = useState<CatalogMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }

    updatePosition();

    function closeOnScroll() {
      setOpen(false);
    }

    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  function handleChange(next: string) {
    onTextChange(next);
    setError(null);
    setHighlightedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (next.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const result = await search({ query: next.trim() });
      setLoading(false);

      if (result.status !== "success") {
        setError(result.message ?? "Lookup failed.");
        setResults([]);
        setHighlightedIndex(-1);
        setOpen(true);
        return;
      }

      setResults(result.results ?? []);
      setHighlightedIndex(-1);
      setOpen(true);
    }, DEBOUNCE_MS);
  }

  function selectMatch(match: CatalogMatch) {
    onSelect(match);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        event.preventDefault();
        selectMatch(results[highlightedIndex]);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          placeholder={placeholder ?? "Search…"}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => (results.length > 0 || error) && setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`${inputClass} pl-9 pr-8`}
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>

      {mounted &&
        open &&
        (results.length > 0 || error) &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            style={{ position: "fixed", top: position.top, left: position.left, width: position.width }}
            className="z-50 max-h-64 overflow-auto rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
          >
            {error && <p className="px-3 py-2 text-xs font-semibold text-destructive">{error}</p>}
            {results.map((match, index) => (
              <button
                key={match.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectMatch(match)}
                className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  index === highlightedIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/60"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{match.label}</span>
                  {match.sublabel && (
                    <span className="block truncate text-[11px] font-normal text-muted-foreground">
                      {match.sublabel}
                    </span>
                  )}
                </span>
                {match.badge && (
                  <span className="shrink-0 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {match.badge}
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
