'use client';

import { useState, useRef } from 'react';
import { Check, Link as LinkIcon, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  url?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'outline' | 'ghost' | 'default' | 'secondary';
}

/**
 * Share button that always shows a small popover with:
 * - "Share" via Web Share API (when available — e.g. mobile)
 * - "Copy link" via clipboard (always available)
 */
export default function ShareButton({
  url,
  label = 'Share',
  className,
  size = 'sm',
  variant = 'outline',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const shareUrl = () => url ?? (typeof window !== 'undefined' ? window.location.href : '');

  const handleNativeShare = async () => {
    setOpen(false);
    try {
      await navigator.share({ url: shareUrl(), title: document.title });
    } catch (e) {
      // AbortError = user cancelled — no toast needed
      if ((e as DOMException).name !== 'AbortError') {
        toast.error('Could not open share sheet. Try copying the link instead.');
      }
    }
  };

  const handleCopy = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select a temporary input
      const input = document.createElement('input');
      input.value = shareUrl();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen((o) => !o)}
        className={cn('gap-1.5', className)}
        title="Share this view"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <LinkIcon className="w-3.5 h-3.5" />
        )}
        {copied ? 'Copied!' : label}
      </Button>

      {open && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Popover */}
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover shadow-lg overflow-hidden">
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors"
              >
                <Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
                Share…
              </button>
            )}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
              📋 Copy link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
