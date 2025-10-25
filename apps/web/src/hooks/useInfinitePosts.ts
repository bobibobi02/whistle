// apps/web/hooks/useInfinitePosts.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type FeedItem = Record<string, any>;

type FetcherResult = {
  items: FeedItem[];
  nextCursor: string | null;
};

type UseInfinitePostsOptions = {
  /** Base endpoint that returns { items, nextCursor } or an array; defaults to /api/posts */
  endpoint?: string;
  /** Extra query params included on every request (e.g., { sort:"latest", window:"7d" }) */
  baseParams?: Record<string, string | number | boolean | null | undefined>;
  /** Page size hint (sent as ?limit=) */
  pageSize?: number;
  /** When false, disables fetching and observer */
  enabled?: boolean;
  /** Auto-load via IntersectionObserver (default: true). If false you'll call loadMore manually. */
  auto?: boolean;
  /** Observer rootMargin for early prefetch (default: "600px 0px") */
  rootMargin?: string;
  /** Optional function to normalize each raw item (e.g., map fields); default: identity */
  normalize?: (raw: any) => FeedItem | null | undefined;
  /** Optional function to get a stable unique id for an item (default: String(item.id || item._id)) */
  getId?: (item: FeedItem) => string | null | undefined;
};

/** Default id getter */
function defaultGetId(item: FeedItem) {
  const id = item?.id ?? item?._id ?? item?.postId;
  return id ? String(id) : null;
}

/** Default normalizer (identity) */
function defaultNormalize(raw: any) {
  return raw as FeedItem;
}

/** Merge params into a URLSearchParams instance */
function paramsToQS(params: Record<string, any> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    qs.set(k, String(v));
  }
  return qs;
}

/** Fetch a page; supports APIs that return either an array or { items, nextCursor } */
async function fetchPage(
  endpoint: string,
  params: Record<string, any>,
  normalize: (r: any) => FeedItem | null | undefined,
): Promise<FetcherResult> {
  const qs = paramsToQS(params);
  const url = `${endpoint}?${qs.toString()}`;
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const data = await res.json().catch(() => ({}));

  const rawItems: any[] = Array.isArray(data) ? data : (data?.items ?? data?.posts ?? data?.data ?? []);
  const items = (rawItems ?? []).map(normalize).filter(Boolean) as FeedItem[];
  const nextCursor = Array.isArray(data) ? null : (data?.nextCursor ?? null);
  return { items, nextCursor };
}

/**
 * useInfinitePosts — cursor-based pagination with optional auto-load sentinel
 *
 * Example:
 * const {
 *   items, loading, error, ended,
 *   loadMore, reset, setSentinel
 * } = useInfinitePosts({
 *   endpoint: '/api/posts',
 *   baseParams: { sort: 'latest' },
 *   pageSize: 12,
 *   normalize: myNormalize,
 * });
 */
export function useInfinitePosts(opts: UseInfinitePostsOptions = {}) {
  const {
    endpoint = '/api/posts',
    baseParams = { sort: 'latest' },
    pageSize = 12,
    enabled = true,
    auto = true,
    rootMargin = '600px 0px',
    normalize = defaultNormalize,
    getId = defaultGetId,
  } = opts;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // de-dupe cache for seen ids
  const seenRef = useRef<Set<string>>(new Set());
  // prevent overlapping requests
  const busyRef = useRef(false);

  const params = useMemo(() => {
    // include a timestamp param to defeat caching layers
    return { ...baseParams, limit: pageSize, cursor: cursor ?? undefined, t: Date.now() };
  }, [baseParams, pageSize, cursor]);

  const loadMore = useCallback(async () => {
    if (!enabled || ended) return;
    if (busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { items: newItems, nextCursor } = await fetchPage(endpoint, params, normalize);

      // merge with de-dupe by id
      const nextList = [...items];
      for (const it of newItems) {
        const id = getId(it);
        if (!id) continue;
        if (!seenRef.current.has(id)) {
          seenRef.current.add(id);
          nextList.push(it);
        }
      }

      setItems(nextList);
      setCursor(nextCursor);
      setEnded(!nextCursor || newItems.length === 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, [enabled, ended, endpoint, params, normalize, items, getId]);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setEnded(false);
    setError(null);
    seenRef.current.clear();
  }, []);

  // initial load
  useEffect(() => {
    if (!enabled) return;
    if (items.length > 0) return; // leave existing content
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Allow the caller to attach a sentinel <div ref={setSentinel} />
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node;
  }, []);

  // IntersectionObserver to auto-load next page
  useEffect(() => {
    if (!enabled || !auto) return;
    const el = sentinelRef.current;
    if (!el || ended) return;

    const io = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (ent?.isIntersecting) {
          void loadMore();
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [enabled, auto, ended, rootMargin, loadMore]);

  return {
    items,
    loading,
    error,
    ended,
    cursor,
    loadMore,
    reset,
    /** Attach to a tiny <div ref={setSentinel} /> near the bottom to enable auto-load */
    setSentinel,
  };
}
