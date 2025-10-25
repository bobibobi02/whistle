import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useState, useCallback, useRef } from "react";

/* ---------- Types ---------- */
type HomePost = {
  id: string;
  userName?: string;
  title?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  likes: number;
  comments: number;
  createdAt?: string | Date | number;
  saved?: boolean;
};

/* ---------- Utils ---------- */
function timeAgo(input?: string | number | Date): string {
  if (!input) return "";
  const d = new Date(input).getTime();
  if (!Number.isFinite(d)) return "";
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  const m = Math.floor(s / 60), h = Math.floor(m / 60), dys = Math.floor(h / 24);
  if (s < 45) return "just now";
  if (s < 90) return "1m ago";
  if (m < 45) return `${m}m ago`;
  if (m < 90) return "1h ago";
  if (h < 24) return `${h}h ago`;
  if (h < 42) return "1d ago";
  if (dys < 7) return `${dys}d ago`;
  const w = Math.round(dys / 7);
  return w <= 1 ? "1w ago" : `${w}w ago`;
}

const TRUE = new Set(["1", "true", "yes", "y", "on", "t"]);
const SAVE_KEY = (id: string) => `whistle:save:${id}`;
const VOTE_KEY = (id: string) => `whistle:vote:${id}`;

const readSaved = (id: string) => { try { return TRUE.has(String(localStorage.getItem(SAVE_KEY(id)) ?? "").toLowerCase().trim()); } catch { return false; } };
const writeSaved = (id: string, v: boolean) => { try { localStorage.setItem(SAVE_KEY(id), v ? "1" : "0"); } catch {} };
const readVote = (id: string): "up" | "down" | null => { try { const v = localStorage.getItem(VOTE_KEY(id)); return v === "up" || v === "down" ? v : null; } catch { return null; } };
const writeVote = (id: string, v: "up" | "down" | null) => { try { if (v) localStorage.setItem(VOTE_KEY(id), v); else localStorage.removeItem(VOTE_KEY(id)); } catch {} };

function num(val: any): number {
  if (val == null) return 0;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && !Number.isNaN(Number(val))) return Number(val);
  if (Array.isArray(val)) return val.length;
  return 0;
}
const dig = (o: any, path: string) => path.split(".").reduce((a: any, k) => (a && a[k] != null ? a[k] : undefined), o);
const textOrNull = (...vals: any[]) => { for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim(); return null; };
function normalizePost(raw: any): HomePost | null {
  if (!raw) return null;
  const id = raw.id ?? raw.postId ?? raw._id ?? raw.slug;
  if (!id) return null;
  const userName =
    raw?.userName ?? raw?.username ?? raw?.user?.username ?? raw?.user?.name ??
    raw?.author?.username ?? raw?.author?.name ?? "user";
  const title = textOrNull(raw.title);
  const content = textOrNull(raw.content, raw.text, raw.body, raw.message, raw.description, raw.caption);
  const mediaUrl =
    raw?.mediaUrl ?? raw?.media?.url ?? raw?.imageUrl ?? raw?.image?.url ??
    (Array.isArray(raw?.images) ? raw.images[0]?.url : null) ??
    (Array.isArray(raw?.attachments) ? raw.attachments[0]?.url : null) ??
    raw?.contentUrl ?? raw?.pictureUrl ?? raw?.fileUrl ?? raw?.media ?? raw?.url ?? raw?.src ?? null;
  const likes =
    num(raw.likeCount) ||
    num(raw.likes) || num(raw.likesCount) || num(raw.upvotes) || num(raw.upvoteCount) ||
    num(dig(raw, "_count.likes")) || num(dig(raw, "_count.votes")) || 0;
  const comments =
    num(raw.commentsCount) || num(raw.commentCount) ||
    num(raw.comments) || num(dig(raw, "_count.comments")) || 0;
  const createdAt = raw.createdAt ?? raw.created_at ?? raw.timestamp ?? undefined;
  return { id: String(id), userName, title, content, mediaUrl, likes, comments, createdAt, saved: !!raw?.saved };
}

async function fetchPopular(limit = 12, windowSel: "7d" | "30d" | "all" = "7d"): Promise<HomePost[]> {
  const t = Date.now();
  const urls = [
    `/api/posts?sort=popular&limit=${limit}${windowSel !== "all" ? `&window=${windowSel}` : ""}&t=${t}`,
    `/api/home/popular?limit=${limit}&window=${windowSel}&t=${t}`,
    `/api/posts?limit=${limit}&t=${t}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) continue;
      const data = await r.json();
      const list: any[] = Array.isArray(data) ? data : (data?.items ?? data?.posts ?? data?.data ?? []);
      if (Array.isArray(list)) return list.map(normalizePost).filter(Boolean) as HomePost[];
    } catch {}
  }
  return [];
}
async function fetchLatest(limit = 12): Promise<HomePost[]> {
  const t = Date.now();
  const urls = [
    `/api/posts?sort=latest&limit=${limit}&t=${t}`,
    `/api/home/latest?limit=${limit}&t=${t}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) continue;
      const data = await r.json();
      const list: any[] = Array.isArray(data) ? data : (data?.items ?? data?.posts ?? data?.data ?? []);
      if (Array.isArray(list)) return list.map(normalizePost).filter(Boolean) as HomePost[];
    } catch {}
  }
  return [];
}

/* ---------- Hardened POST helper (never surfaces raw HTML) ---------- */
function sanitizeError(status: number, ct: string, raw: string): string {
  if (ct.includes("application/json") && raw) {
    try {
      const j = JSON.parse(raw);
      if (j?.error && typeof j.error === "string") return j.error;
    } catch {}
  }
  if (status === 401) return "Please log in to vote.";
  if (status === 429) return "Too many requests. Please slow down.";
  if (status >= 500) return "Server is busy. Try again.";
  return `HTTP ${status}`;
}
async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";
  const raw = await res.text(); // always read once

  if (!res.ok) {
    // NEVER bubble raw HTML into alert()
    const msg = sanitizeError(res.status, ct, raw);
    throw new Error(msg);
  }

  if (!ct.includes("application/json") || !raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/* emoji */
const ICON = {
  bullet: "\u2022",
  like: "\u2764\uFE0F",
  dislike: "\uD83D\uDC94",
  comment: "\uD83D\uDCAC",
  share: "\uD83D\uDD17",
  star: "\u2B50",
  starOutline: "\u2606",
  ellipsis: "\u2026",
};

export default function HomePage() {
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [windowSel, setWindowSel] = useState<"7d" | "30d" | "all">("7d");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"popular" | "latest">("popular");

  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [voteMap, setVoteMap] = useState<Record<string, "up" | "down" | null>>({});
  const [upMap, setUpMap] = useState<Record<string, number>>({});
  const [downMap, setDownMap] = useState<Record<string, number>>({});

  // Hard per-post lock & slightly longer cooldown to absorb spam
  const inFlightRef = useRef<Record<string, boolean>>({});
  const lastClickAtRef = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 500;

  const revalidate = useCallback(async (win = windowSel) => {
    setLoading(true);
    try {
      const popular = await fetchPopular(12, win);
      const list = popular.length ? popular : await fetchLatest(12);
      setPosts(list);
      setMode(popular.length ? "popular" : "latest");

      const ids = list.map(p => p.id);
      let stats: Record<string, { up: number; down: number }> = {};
      try { stats = await postJSON("/api/vote/stats", { ids }); } catch { stats = {}; }

      const s: Record<string, boolean> = {};
      const v: Record<string, "up" | "down" | null> = {};
      const up: Record<string, number> = {};
      const down: Record<string, number> = {};

      for (const p of list) {
        s[p.id] = typeof p.saved === "boolean" ? p.saved : readSaved(p.id);
        v[p.id] = readVote(p.id); // only for button active state
        const db = stats[p.id];
        up[p.id] = db?.up ?? Math.max(0, p.likes ?? 0);
        down[p.id] = db?.down ?? 0;
      }
      setSavedMap(s);
      setVoteMap(v);
      setUpMap(up);
      setDownMap(down);
    } finally {
      setLoading(false);
    }
  }, [windowSel]);

  useEffect(() => { revalidate(windowSel); }, [revalidate, windowSel]);

  const vote = async (id: string, value: 1 | -1) => {
    // cooldown
    const now = Date.now();
    const last = lastClickAtRef.current[id] ?? 0;
    if (now - last < COOLDOWN_MS) return;
    lastClickAtRef.current[id] = now;

    // lock
    if (inFlightRef.current[id]) return;

    const current = voteMap[id] ?? null;
    const desired: "up" | "down" | null =
      (current === "up" && value === 1) ? null :
      (current === "down" && value === -1) ? null :
      (value === 1 ? "up" : "down");

    // same state => no-op
    if (current === desired) return;

    // optimistic adjust
    let up = upMap[id] ?? 0;
    let down = downMap[id] ?? 0;
    if (current === null && desired === "up") up += 1;
    else if (current === null && desired === "down") down += 1;
    else if (current === "up" && desired === null) up = Math.max(0, up - 1);
    else if (current === "down" && desired === null) down = Math.max(0, down - 1);
    else if (current === "up" && desired === "down") { up = Math.max(0, up - 1); down += 1; }
    else if (current === "down" && desired === "up") { down = Math.max(0, down - 1); up += 1; }

    setVoteMap(m => ({ ...m, [id]: desired }));
    setUpMap(m => ({ ...m, [id]: up }));
    setDownMap(m => ({ ...m, [id]: down }));

    // network
    inFlightRef.current[id] = true;
    try {
      const sendVal = desired === null ? 0 : (desired === "up" ? 1 : -1);
      const res = await postJSON("/api/vote", { postId: id, value: sendVal });
      if (typeof (res as any)?.up === "number" && typeof (res as any)?.down === "number") {
        setUpMap(m => ({ ...m, [id]: (res as any).up }));
        setDownMap(m => ({ ...m, [id]: (res as any).down }));
      }
      writeVote(id, desired);
    } catch (e: any) {
      // revert to server truth and show short friendly message
      await revalidate(windowSel);
      const msg = typeof e?.message === "string" ? e.message : "Server is busy. Try again.";
      alert(msg);
    } finally {
      inFlightRef.current[id] = false;
    }
  };

  const share = async (id: string) => {
    const url = typeof window !== "undefined" ? location.origin + `/post/${id}` : `/post/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Whistle", url });
      else { await navigator.clipboard.writeText(url); alert("Link copied to clipboard."); }
    } catch {}
  };

  const ICONS = ICON;

  return (
    <>
      <Head><meta charSet="utf-8" /><title>Whistle</title></Head>

      <section style={{ padding: "40px 16px 10px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(40px, 8vw, 88px)", lineHeight: 1.05, margin: "0 0 6px", letterSpacing: "-0.02em", color: "var(--text)" }}>
            Whistle
          </h1>
          <p style={{ margin: 0, fontSize: "clamp(16px, 2.1vw, 22px)", color: "color-mix(in oklab, var(--text) 78%, transparent)", fontWeight: 600 }}>
            Lightweight posts. Clean vibes.
          </p>
        </div>
      </section>

      <section style={{ padding: "14px 16px 36px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontWeight: 900, fontSize: "clamp(22px, 2.6vw, 30px)", margin: "4px 0 12px", letterSpacing: "-0.01em", color: "var(--text)" }}>
              {mode === "popular" ? "Popular now" : "Latest"}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              {(["7d","30d","all"] as const).map(w => (
                <button key={w} className={`chip${windowSel===w?" active":""}`} aria-pressed={windowSel===w} onClick={() => setWindowSel(w)}>{w}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignItems: "start" }}>
            {posts.map(p => {
              const voted = voteMap[p.id] ?? null;
              const up = upMap[p.id] ?? 0;
              const down = downMap[p.id] ?? 0;

              return (
                <article key={p.id} className="post-card" style={{ padding: 10, borderRadius: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Link href={`/post/${p.id}`} style={{ color: "var(--text)", fontWeight: 700, textDecoration: "none" }}>{p.userName ?? "user"}</Link>
                    <span style={{ color: "color-mix(in oklab, var(--text) 65%, transparent)", fontSize: 12 }}>
                      {ICONS.bullet} {p.createdAt ? timeAgo(p.createdAt) : ""}
                    </span>
                  </div>

                  {p.title && <Link href={`/post/${p.id}`} style={{ textDecoration: "none" }}>
                    <h3 style={{ margin: "2px 0", fontWeight: 900, letterSpacing: "-0.01em", fontSize: "clamp(16px, 1.8vw, 20px)", color: "var(--text)" }}>{p.title}</h3>
                  </Link>}

                  {p.content && <div style={{ color: "var(--text)", opacity: 0.92, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{p.content}</div>}

                  {p.mediaUrl && (
                    <Link href={`/post/${p.id}`} className="feed-media-link" style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          width: "100%", height: 220, borderRadius: 12, overflow: "hidden",
                          border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
                          backgroundColor: "rgba(255,255,255,0.02)",
                          backgroundImage: `url("${p.mediaUrl}")`,
                          backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "contain",
                        }}
                        aria-label="Open post"
                      />
                    </Link>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 2 }}>
                    <button className={`chip${voted==="up"?" active":""}`} onClick={() => vote(p.id, +1)} aria-label="Like" title="Like" style={{ padding: "6px 10px" }}>
                      <span aria-hidden>{ICON.like}</span><span>Like</span>
                    </button>
                    <button className={`chip${voted==="down"?" active":""}`} onClick={() => vote(p.id, -1)} aria-label="Dislike" title="Dislike" style={{ padding: "6px 10px" }}>
                      <span aria-hidden>{ICON.dislike}</span><span>Dislike</span>
                    </button>

                    <Link href={`/post/${p.id}#comments`} className="chip" title="Comments" aria-label="Comments" style={{ padding: "6px 10px", textDecoration: "none" }}>
                      <span aria-hidden>{ICON.comment}</span><span>Comments</span>
                    </Link>

                    <button className="chip" onClick={() => {
                      const url = typeof window !== "undefined" ? location.origin + `/post/${p.id}` : `/post/${p.id}`;
                      (async () => {
                        try {
                          if (navigator.share) await navigator.share({ title: "Whistle", url });
                          else { await navigator.clipboard.writeText(url); alert("Link copied to clipboard."); }
                        } catch {}
                      })();
                    }} title="Share" aria-label="Share" style={{ padding: "6px 10px" }}>
                      <span aria-hidden>{ICON.share}</span><span>Share</span>
                    </button>

                    <span className="meta-pill" style={{ marginLeft: "auto" }} title="Likes">{ICON.like} {up}</span>
                    <span className="meta-pill" title="Dislikes">{ICON.dislike} {down}</span>
                  </div>
                </article>
              );
            })}

            {loading && <div style={{ gridColumn: "1 / -1", color: "color-mix(in oklab, var(--text) 65%, transparent)", padding: "10px 2px" }}>Loading{ICON.ellipsis}</div>}
            {!loading && posts.length === 0 && <div style={{ gridColumn: "1 / -1", color: "color-mix(in oklab, var(--text) 65%, transparent)", padding: "10px 2px" }}>No popular posts yet.</div>}
          </div>
        </div>
      </section>
    </>
  );
}
