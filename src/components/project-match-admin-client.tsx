'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProjectMatchThread } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  archived: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  expired: 'bg-muted text-muted-foreground border-border',
  finalized: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

function ThreadCard({ thread }: { thread: ProjectMatchThread }) {
  return (
    <Link
      href={`/admin/project-match/${thread.id}`}
      className="group flex items-center justify-between rounded-2xl border bg-card p-5 hover:bg-accent transition-colors gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{thread.email}</p>
        {thread.requesterName && (
          <p className="text-xs text-muted-foreground mt-0.5">{thread.requesterName}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{thread.interests}</p>
      </div>
      <Badge
        variant="outline"
        className={`shrink-0 text-xs uppercase tracking-wide ${STATUS_STYLES[thread.status] ?? ''}`}
      >
        {thread.status}
      </Badge>
    </Link>
  );
}

/** Shared paginated list used by both sections. */
function PaginatedThreadList({ threads }: { threads: ProjectMatchThread[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_PAGE_SIZE));

  const totalPages = Math.max(1, Math.ceil(threads.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageThreads = threads.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  // ── Pin the list container to the tallest height seen so far ──────────
  // This prevents the page from jumping when the last page has fewer items.
  const listRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);

  // Reset pin whenever the user changes page size
  useEffect(() => { setMinHeight(undefined); }, [pageSize]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        setMinHeight(prev => (prev === undefined ? h : Math.max(prev, h)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // ──────────────────────────────────────────────────────────────────────

  const applyPageSize = () => {
    const parsed = parseInt(pageSizeInput, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setPageSize(parsed);
      setPage(1);
    } else {
      setPageSizeInput(String(pageSize));
    }
  };

  return (
    <div className="space-y-4">
      {/* Thread list — height is pinned to the tallest page seen */}
      <div
        ref={listRef}
        style={{ minHeight: minHeight !== undefined ? `${minHeight}px` : undefined }}
      >
        {pageThreads.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">No threads.</p>
        ) : (
          <div className="grid gap-3">
            {pageThreads.map(t => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </div>
        )}
      </div>


      {/* ── Pagination bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-muted/40">

        {/* Left: page counter + per-page control */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Page <span className="font-semibold text-foreground">{clampedPage}</span> of{' '}
            <span className="font-semibold text-foreground">{totalPages}</span>
            <span className="text-muted-foreground/60 ml-1">
              ({threads.length} total)
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Per page:</label>
            <Input
              type="number"
              min={1}
              value={pageSizeInput}
              onChange={e => setPageSizeInput(e.target.value)}
              onBlur={applyPageSize}
              onKeyDown={e => { if (e.key === 'Enter') applyPageSize(); }}
              className="h-7 w-16 text-xs text-center px-1"
            />
          </div>
        </div>

        {/* Right: prev / page pills / next */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={clampedPage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Previous page</span>
          </Button>

          {/* Show up to 7 page pills; collapse middle pages with ellipsis beyond that */}
          {(() => {
            const range: (number | '…')[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) range.push(i);
            } else {
              range.push(1);
              if (clampedPage > 3) range.push('…');
              for (let i = Math.max(2, clampedPage - 1); i <= Math.min(totalPages - 1, clampedPage + 1); i++) {
                range.push(i);
              }
              if (clampedPage < totalPages - 2) range.push('…');
              range.push(totalPages);
            }
            return range.map((n, idx) =>
              n === '…' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`h-7 min-w-[1.75rem] rounded-md px-1.5 text-xs font-medium transition-colors ${
                    n === clampedPage
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-muted-foreground'
                  }`}
                >
                  {n}
                </button>
              )
            );
          })()}

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={clampedPage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  threads: ProjectMatchThread[];
}

export function ProjectMatchAdminClient({ threads }: Props) {
  const activeThreads = threads.filter(t => t.status !== 'finalized');
  const finalizedThreads = threads.filter(t => t.status === 'finalized');

  const [finalizedOpen, setFinalizedOpen] = useState(false);

  return (
    <div className="space-y-10">
      {/* ── Active threads (paginated) ─────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Active threads</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open, archived, or expired
          </p>
        </div>
        <PaginatedThreadList threads={activeThreads} />
      </section>

      {/* ── Finalized threads (accordion + paginated) ──────────────── */}
      {finalizedThreads.length > 0 && (
        <section className="border rounded-2xl overflow-hidden">
          <button
            onClick={() => setFinalizedOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <div>
              <span className="font-semibold text-sm">Finalized threads</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {finalizedThreads.length} thread{finalizedThreads.length !== 1 ? 's' : ''}
              </span>
            </div>
            {finalizedOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            }
          </button>

          {finalizedOpen && (
            <div className="p-4 border-t">
              <PaginatedThreadList threads={finalizedThreads} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
