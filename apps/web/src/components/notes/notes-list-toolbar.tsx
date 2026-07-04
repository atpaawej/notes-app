"use client";

import { Search, X } from "lucide-react";
import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TagOption = { id: string; name: string };

type Props = {
  tags: TagOption[];
  activeTagId?: string;
  total: number;
};

function useUrlSearchParam(key: string): string {
  const subscribe = React.useCallback((callback: () => void) => {
    window.addEventListener("popstate", callback);
    window.addEventListener("notes:urlchange", callback);
    return () => {
      window.removeEventListener("popstate", callback);
      window.removeEventListener("notes:urlchange", callback);
    };
  }, []);
  const getSnapshot = React.useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? "";
  }, [key]);
  return React.useSyncExternalStore(subscribe, getSnapshot, () => "");
}

export function NotesListToolbar({ tags, activeTagId, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearchFromSnapshot = useUrlSearchParam("q");
  const urlSearch = searchParams.get("q") ?? urlSearchFromSnapshot;
  const [searchValue, setSearchValue] = React.useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = React.useState(urlSearch);

  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearchValue(urlSearch);
  }

  const updateParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateParams({ q: value });
  }, 350);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchValue("");
    updateParams({ q: null });
  };

  const activeTag = tags.find((tag) => tag.id === activeTagId);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search notes…"
          className="pl-9 pr-9"
          aria-label="Search notes"
        />
        {searchValue ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          {tags.map((tag) => {
            const isActive = tag.id === activeTagId;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  updateParams({ tag: isActive ? null : tag.id })
                }
                className={cn(
                  "transition-colors",
                )}
              >
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="cursor-pointer rounded-full"
                >
                  {tag.name}
                </Badge>
              </button>
            );
          })}
          {activeTag ? (
            <button
              type="button"
              onClick={() => updateParams({ tag: null })}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear filter
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {total} {total === 1 ? "note" : "notes"}
        {activeTag ? ` tagged “${activeTag.name}”` : ""}
      </p>
    </div>
  );
}

function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return React.useCallback(
    (...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
