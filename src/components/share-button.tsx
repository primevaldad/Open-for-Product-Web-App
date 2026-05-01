'use client';

import { useState } from 'react';
import { Check, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  /** URL to share. Defaults to `window.location.href` if omitted. */
  url?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'outline' | 'ghost' | 'default' | 'secondary';
}

/**
 * A reusable share button that:
 * - Uses the native Web Share API when available (mobile)
 * - Falls back to copying the URL to the clipboard on desktop
 */
export default function ShareButton({
  url,
  label = 'Share',
  className,
  size = 'sm',
  variant = 'outline',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url ?? window.location.href;

    // Use native share sheet on mobile if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: document.title });
        return;
      } catch (e) {
        // User cancelled — don't fall through to clipboard
        if ((e as DOMException).name === 'AbortError') return;
        // Any other error: fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link. Please copy the URL from your browser.');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={cn('gap-1.5', className)}
      title="Share this view"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Link className="w-3.5 h-3.5" />
      )}
      {copied ? 'Copied!' : label}
    </Button>
  );
}
