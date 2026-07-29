'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { User, SteemAccount, SteemPost, SteemNotification } from '@/lib/types';
import { getSteemUserAction, getSteemPostsAction, getSteemNotificationsAction, getSteemAccountValueAction } from '@/app/actions/steem';
import { formatSteemUrl } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SteemLogo } from '@/components/steem-logo';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  ShieldCheck, 
  ExternalLink, 
  Bell, 
  FileText, 
  Rss, 
  Loader2, 
  Link2, 
  Sparkles, 
  ArrowUpRight,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

interface SteemExternalFeedProps {
  currentUser: User;
}

export function SteemExternalFeed({ currentUser }: SteemExternalFeedProps) {
  const [steemUser, setSteemUser] = useState<SteemAccount | null>(null);
  const [blogPosts, setBlogPosts] = useState<SteemPost[] | null>(null);
  const [authoredPosts, setAuthoredPosts] = useState<SteemPost[] | null>(null);
  const [notifications, setNotifications] = useState<SteemNotification[] | null>(null);
  const [estimatedUSD, setEstimatedUSD] = useState<string | null>(null);

  const [hasMoreNotifs, setHasMoreNotifs] = useState<boolean>(true);
  const [isLoadingMoreNotifs, setIsLoadingMoreNotifs] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const notifObserverTarget = React.useRef<HTMLDivElement>(null);

  const steemUsername = currentUser.steemUsername;
  const preferredDomain = (currentUser.steemPreferredDomain || 'steemit.com').replace(/^https?:\/\//, '').replace(/\/$/, '');

  const formatReputation = (rep: string | number) => {
    const repNum = Number(rep);
    if (isNaN(repNum) || repNum === 0) return '(25)';
    const score = Math.floor(Math.log10(Math.abs(repNum)) - 9) * 9 + 25;
    return `(${score})`;
  };

  const formatVotingPower = (power: number) => {
    return `${(power / 100).toFixed(2)}%`;
  };

  const loadMoreNotifications = React.useCallback(async () => {
    if (!steemUsername || isLoadingMoreNotifs || !hasMoreNotifs || !notifications || notifications.length === 0) {
      return;
    }

    const lastNotif = notifications[notifications.length - 1];
    const lastId = lastNotif?.id;
    if (!lastId) return;

    setIsLoadingMoreNotifs(true);
    try {
      const res = await getSteemNotificationsAction(steemUsername, 50, lastId);
      const newNotifs = res.notifications || [];

      if (newNotifs.length === 0) {
        setHasMoreNotifs(false);
      } else {
        setNotifications(prev => {
          if (!prev) return newNotifs;
          const existingIds = new Set(prev.map(n => n.id));
          const filtered = newNotifs.filter(n => !existingIds.has(n.id));
          if (filtered.length === 0) {
            setHasMoreNotifs(false);
          }
          return [...prev, ...filtered];
        });
      }
    } catch (err) {
      console.error('Error loading more notifications:', err);
    } finally {
      setIsLoadingMoreNotifs(false);
    }
  }, [steemUsername, isLoadingMoreNotifs, hasMoreNotifs, notifications]);

  useEffect(() => {
    const target = notifObserverTarget.current;
    if (!target || !hasMoreNotifs || isLoadingMoreNotifs) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMoreNotifications();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [hasMoreNotifs, isLoadingMoreNotifs, notifications?.length, loadMoreNotifications]);

  useEffect(() => {
    if (!steemUsername) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getSteemUserAction(steemUsername),
      getSteemAccountValueAction(steemUsername),
      getSteemNotificationsAction(steemUsername, 50),
      getSteemPostsAction(steemUsername, 'blog', 15),
      getSteemPostsAction(steemUsername, 'posts', 15),
    ])
      .then(([accountRes, valueRes, notifsRes, blogRes, postsRes]) => {
        if (!isMounted) return;

        if (accountRes.error) {
          setError(accountRes.error);
        } else {
          setSteemUser(accountRes.account);
        }

        if (valueRes.estimatedUSD) {
          setEstimatedUSD(valueRes.estimatedUSD);
        }

        const fetchedNotifs = notifsRes.notifications || [];
        setNotifications(fetchedNotifs);
        setHasMoreNotifs(fetchedNotifs.length >= 50);

        setBlogPosts(blogRes.posts || []);
        setAuthoredPosts(postsRes.posts || []);
      })
      .catch(err => {
        if (isMounted) {
          console.error('Error loading Steem feed data:', err);
          setError('Failed to fetch Steem blockchain data.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [steemUsername]);

  // Handle unlinked Steem state
  if (!steemUsername) {
    return (
      <Card className="border-dashed border-2 p-8 text-center bg-card/60 backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <SteemLogo className="h-8 w-8 text-[#3c4fe0]" />
        </div>
        <CardTitle className="text-2xl font-bold mb-2">Connect Your Steem Blockchain Account</CardTitle>
        <CardDescription className="max-w-md mx-auto text-base mb-6">
          Link your Steem username to sync your blockchain blog, view notifications, and verify your identity on Open for Product.
        </CardDescription>
        <Button asChild size="lg" className="gap-2">
          <Link href="/settings">
            <Sparkles className="h-4 w-4" />
            Activate Steem in Settings
          </Link>
        </Button>
      </Card>
    );
  }

  const formatImageUrl = (url?: any): string => {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return `https://${trimmed}`;
    return trimmed;
  };

  // Parse Steem profile JSON metadata for bio, website, cover image, and custom avatar
  const steemProfileMetadata = (() => {
    if (!steemUser) return null;

    const parseJSON = (str?: string) => {
      if (!str || typeof str !== 'string') return null;
      try {
        const obj = JSON.parse(str);
        return obj?.profile || obj || null;
      } catch {
        return null;
      }
    };

    const postingMeta = parseJSON(steemUser.posting_json_metadata);
    const jsonMeta = parseJSON(steemUser.json_metadata);

    const about = postingMeta?.about || jsonMeta?.about || '';
    const website = postingMeta?.website || jsonMeta?.website || '';

    const rawCover = 
      postingMeta?.cover_image || 
      postingMeta?.background || 
      postingMeta?.header || 
      postingMeta?.cover_image_url || 
      jsonMeta?.cover_image || 
      jsonMeta?.background || 
      jsonMeta?.header || 
      jsonMeta?.cover_image_url || 
      '';

    const rawAvatar = 
      postingMeta?.profile_image || 
      postingMeta?.avatar || 
      jsonMeta?.profile_image || 
      jsonMeta?.avatar || 
      '';

    return {
      about,
      website,
      coverImage: formatImageUrl(rawCover),
      avatarUrl: formatImageUrl(rawAvatar) || `https://steemitimages.com/u/${steemUser.name}/avatar`,
    };
  })();

  const coverImage = steemProfileMetadata?.coverImage;

  return (
    <div className="space-y-6">
      {/* --- Steem Profile Summary Card --- */}
      {isLoading ? (
        <Card className="p-8 text-center flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading Steem Blockchain Profile & Activity...</span>
        </Card>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Steem Connection Notice</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : steemUser ? (
        <div 
          className="relative rounded-2xl overflow-hidden border shadow-xl bg-card transition-all"
          style={{
            backgroundImage: coverImage ? `url("${coverImage}")` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Glassmorphic dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/50 backdrop-blur-[2px]" />

          <div className="relative z-10 p-6 md:p-8 text-white space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 ring-4 ring-white/20 shadow-lg shrink-0 rounded-full overflow-hidden relative">
                  <AvatarImage 
                    src={steemProfileMetadata?.avatarUrl} 
                    alt={steemUser.name}
                    className="object-cover object-center h-full w-full"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl h-full w-full flex items-center justify-center">
                    {steemUser.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={formatSteemUrl(`@${steemUser.name}`, preferredDomain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl font-bold hover:underline flex items-center gap-1.5"
                    >
                      @{steemUser.name}
                      <span className="text-base font-normal text-white/70">
                        {formatReputation(steemUser.reputation)}
                      </span>
                      <ArrowUpRight className="h-4 w-4 opacity-70" />
                    </a>
                    {currentUser.steemVerified && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/80 mt-1">
                    Frontend target: <span className="font-mono text-xs text-primary-foreground/90">{preferredDomain}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 self-start md:self-auto">
                <div className="text-center px-3">
                  <p className="text-xs text-white/70 uppercase tracking-wider font-semibold">Posts</p>
                  <p className="text-lg font-bold">{steemUser.post_count}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-center px-3">
                  <p className="text-xs text-white/70 uppercase tracking-wider font-semibold">Voting Power</p>
                  <p className="text-lg font-bold">{formatVotingPower(steemUser.voting_power)}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-center px-3">
                  <p className="text-xs text-white/70 uppercase tracking-wider font-semibold">Est. Balance</p>
                  <p className="text-lg font-bold">{estimatedUSD || steemUser.balance}</p>
                </div>
              </div>
            </div>

            {/* Profile Bio & Website */}
            {(steemProfileMetadata?.about || steemProfileMetadata?.website) && (
              <div className="pt-2 border-t border-white/10 text-sm text-white/90 space-y-1">
                {steemProfileMetadata.about && <p className="italic">{steemProfileMetadata.about}</p>}
                {steemProfileMetadata.website && (
                  <a 
                    href={steemProfileMetadata.website.startsWith('http') ? steemProfileMetadata.website : `https://${steemProfileMetadata.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary-foreground/90 hover:underline gap-1 text-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {steemProfileMetadata.website}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* --- External Activity Sub-Tabs --- */}
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none h-auto p-0 mb-6 w-full justify-start gap-6 overflow-x-auto flex-nowrap">
          <TabsTrigger 
            value="notifications"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap gap-2"
          >
            <Bell className="h-4 w-4" /> Notifications {notifications && notifications.length > 0 && `(${notifications.length})`}
          </TabsTrigger>
          <TabsTrigger 
            value="blog"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap gap-2"
          >
            <Rss className="h-4 w-4" /> Blog {blogPosts && blogPosts.length > 0 && `(${blogPosts.length})`}
          </TabsTrigger>
          <TabsTrigger 
            value="posts"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap gap-2"
          >
            <FileText className="h-4 w-4" /> Posts {authoredPosts && authoredPosts.length > 0 && `(${authoredPosts.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Notifications Sub-Tab */}
        <TabsContent value="notifications">
          {isLoading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading notifications...</Card>
          ) : !notifications || notifications.length === 0 ? (
            <EmptyState message="No recent notifications found on the Steem blockchain." />
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, idx) => {
                const targetUrl = formatSteemUrl(notif.url || `@${steemUsername}`, preferredDomain);

                return (
                  <Card key={`${notif.id}-${idx}`} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{notif.msg}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notif.date).toLocaleString()} • Type: <span className="font-semibold uppercase text-[10px]">{notif.type}</span>
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                        <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {hasMoreNotifs && (
                <div className="pt-4 text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadMoreNotifications} 
                    disabled={isLoadingMoreNotifs}
                    className="gap-2"
                  >
                    {isLoadingMoreNotifs ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading older notifications...
                      </>
                    ) : (
                      'Load More Notifications'
                    )}
                  </Button>
                  <div ref={notifObserverTarget} className="h-4" />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Blog Sub-Tab (Authored + Reblogged) */}
        <TabsContent value="blog">
          {isLoading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading blog feed...</Card>
          ) : !blogPosts || blogPosts.length === 0 ? (
            <EmptyState message="No blog posts found on Steem." />
          ) : (
            <div className="space-y-4">
              {blogPosts.map(post => {
                const postUrl = formatSteemUrl(post.url, preferredDomain);
                return (
                  <Card key={post.post_id} className="p-5 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {post.community_title || post.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight hover:underline">
                          <a href={postUrl} target="_blank" rel="noopener noreferrer">
                            {post.title}
                          </a>
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.body.replace(/!\[.*?\]\(.*?\)/g, '').slice(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            {post.pending_payout_value && post.pending_payout_value !== '$0.00' ? post.pending_payout_value : post.total_payout_value}
                          </span>
                          <span>•</span>
                          <span>{post.net_votes} votes</span>
                          <span>•</span>
                          <span>{post.children} comments</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="gap-1 text-xs shrink-0">
                        <a href={postUrl} target="_blank" rel="noopener noreferrer">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Posts Sub-Tab (Directly Authored) */}
        <TabsContent value="posts">
          {isLoading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading authored posts...</Card>
          ) : !authoredPosts || authoredPosts.length === 0 ? (
            <EmptyState message="No direct authored posts found on Steem." />
          ) : (
            <div className="space-y-4">
              {authoredPosts.map(post => {
                const postUrl = formatSteemUrl(post.url, preferredDomain);
                return (
                  <Card key={post.post_id} className="p-5 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {post.community_title || post.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight hover:underline">
                          <a href={postUrl} target="_blank" rel="noopener noreferrer">
                            {post.title}
                          </a>
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.body.replace(/!\[.*?\]\(.*?\)/g, '').slice(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            {post.pending_payout_value && post.pending_payout_value !== '$0.00' ? post.pending_payout_value : post.total_payout_value}
                          </span>
                          <span>•</span>
                          <span>{post.net_votes} votes</span>
                          <span>•</span>
                          <span>{post.children} comments</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="gap-1 text-xs shrink-0">
                        <a href={postUrl} target="_blank" rel="noopener noreferrer">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
