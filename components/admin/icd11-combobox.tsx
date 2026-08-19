"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { searchIcd11, type Icd11Match } from "@/actions/search-icd11";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

export function Icd11Combobox({
  value,
  onSelect,
  onTextChange,
  disabled,
  placeholder,
}: {
  value: string;
  onSelect: (match: Icd11Match) => void;
  onTextChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [results, setResults] = useState<Icd11Match[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // -1 = nothing highlighted. Focus never leaves the input (standard ARIA
  // combobox pattern) — arrow keys move this index, aria-activedescendant
  // tells assistive tech which option is "virtually" focused. That also
  // sidesteps the portal's tab-order problem entirely: since focus never
  // moves into the portaled list, Tab from the input goes to whatever's
  // next in the real DOM, regardless of where the list itself renders.
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Rendered via a portal (see below), so its screen position has to be
  // tracked explicitly rather than relying on CSS `absolute` — which
  // otherwise gets clipped by the first ancestor with `overflow-hidden`
  // (Card uses that for its rounded corners).
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

    // Simplest correct behavior for a fixed-position dropdown: close it
    // on scroll rather than tracking the input's new position — matches
    // how most native/OS dropdowns behave anyway.
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
      const result = await searchIcd11({ query: next.trim() });
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

  function selectMatch(match: Icd11Match) {
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
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          placeholder={placeholder ?? "Search ICD-11 or type a condition"}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => (results.length > 0 || error) && setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-8 text-sm text-foreground"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
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
            className="z-50 max-h-64 overflow-auto rounded-md border border-border bg-popover shadow-md"
          >
            {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}
            {results.map((match, index) => (
              <button
                key={match.uri}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectMatch(match)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  index === highlightedIndex ? "bg-accent" : "hover:bg-accent"
                }`}
              >
                {match.code && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {match.code}
                  </span>
                )}
                <span className="text-foreground">{match.title}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
