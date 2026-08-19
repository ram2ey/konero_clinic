"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(next: string) {
    onTextChange(next);
    setError(null);

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
        setOpen(true);
        return;
      }

      setResults(result.results ?? []);
      setOpen(true);
    }, DEBOUNCE_MS);
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder ?? "Search ICD-11 or type a condition"}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => (results.length > 0 || error) && setOpen(true)}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-8 text-sm text-foreground"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}
          {results.map((match) => (
            <button
              key={match.uri}
              type="button"
              onClick={() => {
                onSelect(match);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              {match.code && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {match.code}
                </span>
              )}
              <span className="text-foreground">{match.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
