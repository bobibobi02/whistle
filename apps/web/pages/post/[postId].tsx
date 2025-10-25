// apps/web/pages/post/[postId].tsx
'use client';

import { useEffect, useMemo, useState, useCallback, memo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { postJSON } from '@/lib/fetchJson';

/* ---------- Home-feed emoji icons (match index.tsx) ---------- */
const ICON = {
  like: '\u2764\uFE0F',    // ❤️
  dislike: '\uD83D\uDC94', // 💔
  comment: '\uD83D\uDCAC', // 💬
  link: '\uD83D\uDD17',    // 🔗
  reply: '\u21A9\uFE0F',   // ↩️
  edit: '\u270F\uFE0F',    // ✏️
  del: '\uD83D\uDDD1\uFE0F', // 🗑️
  save: '\u2B50',          // ⭐ (post-level only)
  warn: '⚠️',
  info: 'ℹ️',
  bullet: '\u2022',
};

/* ---------- Helpers ---------- */
function timeAgo(input?: string | number | Date): string {
  if (!input) return '';
  const d = new Date(input).getTime();
  if (!Number.isFinite(d)) return '';
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  const m = Math.floor(s / 60), h = Math.floor(m / 60), dys = Math.floor(h / 24);
  if (s < 45) return 'just now';
  if (s < 90) return '1m ago';
  if (m < 45) return `${m}m ago`;
  if (m < 90) return '1h ago';
  if (h < 24) return `${h}h ago`;
  if (h < 42) return '1d ago';
  if (dys < 7) return `${dys}d ago`;
  const w = Math.round(dys / 7);
  return w <= 1 ? '1w ago' : `${w}w ago`;
}
function num(v: any) {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && !Number.isNaN(Number(v))) return Number(v);
  if (Array.isArray(v)) return v.length;
  return 0;
}

/* ---------- Safe parsing helpers for GETs ---------- */
async function safeJson<T = any>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  const raw = await res.text().catch(() => '');
  if (!raw) return null;
  if (!ct.includes('application/json')) {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  try { return JSON.parse(raw) as T; } catch { return null; }
}
function sanitizeError(status: number, ct: string, raw: string): string {
  if (ct.includes('application/json') && raw) {
    try { const j = JSON.parse(raw); if (j?.error && typeof j.error === 'string') return j.error; } catch {}
  }
  if (status === 401) return 'Please log in.';
  if (status === 429) return 'Too many requests. Please slow down.';
  if (status >= 500) return 'Server is busy. Try again.';
  return `HTTP ${status}`;
}

/* ---------- Types ---------- */
type Post = {
  id: string;
  title: string;
  body?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  userEmail: string;
  subforumName?: string | null;
  createdAt?: string;
};

type DialogTone = 'default' | 'danger';
type DialogConfig =
  | { kind: 'confirm'; message: string; resolve: (ok: boolean) => void; tone?: DialogTone; confirmLabel?: string; cancelLabel?: string }
  | { kind: 'notify'; message: string; resolve: () => void; tone?: DialogTone; confirmLabel?: string };

/* ---------- Custom Dialog ---------- */
function DialogHost({ dialog, close }: { dialog: DialogConfig | null; close: () => void }) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { confirmBtnRef.current?.focus(); }, [dialog]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!dialog) return;
      if (e.key === 'Escape') { if (dialog.kind === 'confirm') dialog.resolve(false); else dialog.resolve(); close(); }
      if (e.key === 'Enter')  { if (dialog.kind === 'confirm') dialog.resolve(true);  else dialog.resolve(); close(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  if (!dialog) return null;
  const isConfirm = dialog.kind === 'confirm';
  const tone: DialogTone = dialog.tone ?? 'default';
  const confirmLabel = dialog.confirmLabel ?? (isConfirm ? (tone === 'danger' ? 'Delete' : 'OK') : 'OK');
  const cancelLabel  = (dialog as any).cancelLabel ?? 'Cancel';

  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) { if (isConfirm) dialog.resolve(false); else dialog.resolve(); close(); }
  };
  const onConfirm = () => { if (isConfirm) dialog.resolve(true); else dialog.resolve(); close(); };
  const onCancel  = () => { if (isConfirm) dialog.resolve(false); else dialog.resolve(); close(); };

  return (
    <div ref={overlayRef} className={`dlg2-overlay ${tone}`} role="dialog" aria-modal="true" onMouseDown={onOverlayClick}>
      <div className={`dlg2-card ${tone}`}>
        <div className="dlg2-header">
          <div className="dlg2-kicker">
            <span aria-hidden className="dlg2-icon">{tone === 'danger' ? ICON.warn : ICON.info}</span>
            <span className="dlg2-title">{isConfirm ? 'Confirm' : 'Notice'}</span>
          </div>
        </div>
        <div className="dlg2-body">{dialog.message}</div>
        <div className="dlg2-actions">
          {isConfirm ? (
            <>
              <button ref={confirmBtnRef} className={`chip ${tone === 'danger' ? 'fill-rose' : 'fill-emerald'}`} onClick={onConfirm}>
                <span aria-hidden>{tone === 'danger' ? ICON.del : '✅'}</span><span>{confirmLabel}</span>
              </button>
              <button className="chip outline" onClick={onCancel}><span aria-hidden>✖️</span><span>{cancelLabel}</span></button>
            </>
          ) : (
            <button ref={confirmBtnRef} className="chip fill-emerald" onClick={onConfirm}><span aria-hidden>👍</span><span>{confirmLabel}</span></button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .dlg2-overlay{position:fixed;inset:0;display:grid;place-items:center;backdrop-filter:blur(2px);z-index:60;animation:fadeIn .12s ease-out}
        .dlg2-overlay.default{background:linear-gradient(0deg,rgba(3,7,18,.78),rgba(3,7,18,.78)),radial-gradient(60% 40% at 50% 10%,rgba(16,185,129,.12),transparent 70%)}
        .dlg2-overlay.danger{background:linear-gradient(0deg,rgba(3,7,18,.78),rgba(3,7,18,.78)),radial-gradient(60% 40% at 50% 10%,rgba(244,63,94,.10),transparent 70%)}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-transparency:reduce){.dlg2-overlay.default,.dlg2-overlay.danger{background:rgba(3,7,18,.86);backdrop-filter:none}}
        .dlg2-card{width:min(560px,calc(100% - 32px));border-radius:18px;background:linear-gradient(180deg,rgba(18,24,35,.95),rgba(12,17,27,.95));border:1px solid #0b1220;box-shadow:0 18px 40px rgba(0,0,0,.42);color:#e5e7eb;transform:scale(.98);animation:popIn .14s ease-out forwards}
        @keyframes popIn{to{transform:scale(1)}}
        .dlg2-header{padding:14px 16px 8px;background:linear-gradient(180deg,rgba(34,197,94,.10),transparent);border-top-left-radius:18px;border-top-right-radius:18px}
        .dlg2-card.danger .dlg2-header{background:linear-gradient(180deg,rgba(244,63,94,.12),transparent)}
        .dlg2-kicker{display:flex;align-items:center;gap:10px}
        .dlg2-icon{font-size:18px}
        .dlg2-title{font-weight:800;letter-spacing:.01em;color:#f3f4f6}
        .dlg2-body{padding:10px 16px 6px;color:#cbd5e1;line-height:1.6}
        .dlg2-actions{padding:12px 16px 16px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
        .chip.fill-emerald{background:var(--emerald);color:#0b1220;border-radius:999px;padding:8px 12px;border:1px solid rgba(255,255,255,.08)}
        .chip.fill-rose{background:var(--rose);color:#0b1220;border-radius:999px;padding:8px 12px;border:1px solid rgba(255,255,255,.08)}
        .chip.outline{border-radius:999px;padding:8px 12px;border:1px solid rgba(148,163,184,.35);color:#e5e7eb;background:transparent}
        .chip.outline:hover{background:rgba(255,255,255,.04)}
      `}</style>
    </div>
  );
}

/* ===================== PAGE ===================== */
export default function PostPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { postId } = router.query as { postId?: string };

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // unified dialog state
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const closeDialog = () => setDialog(null);
  const confirm = useCallback((message: string, tone: DialogTone = 'default', confirmLabel?: string, cancelLabel?: string) =>
    new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', message, resolve, tone, confirmLabel, cancelLabel }))
  , []);
  const notify = useCallback((message: string, tone: DialogTone = 'default', confirmLabel?: string) =>
    new Promise<void>((resolve) => setDialog({ kind: 'notify', message, resolve, tone, confirmLabel }))
  , []);

  // single-post vote state
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);

  const inFlightRef = useRef(false);
  const lastClickAtRef = useRef(0);
  const COOLDOWN_MS = 500;

  useEffect(() => {
    if (!router.isReady || !postId) return;
    let active = true;

    const fetchPost = async (): Promise<Post | null> => {
      let r = await fetch(`/api/posts?id=${encodeURIComponent(postId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) {
        r = await fetch(`/api/posts?ids=${encodeURIComponent(postId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Failed to load post (${r.status})`);
      }
      const j = await safeJson<any>(r);
      const item =
        (Array.isArray(j?.items) && j.items[0]) ||
        (Array.isArray(j) && j[0]) ||
        j?.item ||
        j?.post ||
        null;
      return item as Post | null;
    };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await fetchPost();
        if (!active) return;
        setPost(p);

        if (p?.id) {
          try {
            const stats = await postJSON<Record<string, { up: number; down: number }>>('/api/vote/stats', { ids: [p.id] });
            setUp(stats?.[p.id]?.up ?? num((p as any)?.likes) ?? 0);
            setDown(stats?.[p.id]?.down ?? 0);
          } catch {
            setUp(num((p as any)?.likes) ?? 0);
            setDown(0);
          }
          try {
            const v = localStorage.getItem(`whistle:vote:${p.id}`);
            // ✅ FIXED: closed the parenthesis properly
            setVoted(v === 'up' || v === 'down' ? (v as 'up' | 'down') : null);
          } catch {}
        }
      } catch (e: any) {
        if (active) setError(e?.message ?? 'Failed to load post');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [router.isReady, postId]);

  const isOwner = useMemo(() => {
    if (!session?.user?.email || !post?.userEmail) return false;
    return session.user.email === post.userEmail;
  }, [session?.user?.email, post?.userEmail]);

  /* ---------- Voting ---------- */
  const vote = useCallback(async (value: 1 | -1) => {
    if (!post) return;
    const now = Date.now();
    if (now - lastClickAtRef.current < COOLDOWN_MS) return;
    lastClickAtRef.current = now;
    if (inFlightRef.current) return;

    const desired: 'up' | 'down' | null =
      (voted === 'up' && value === 1) ? null :
      (voted === 'down' && value === -1) ? null :
      (value === 1 ? 'up' : 'down');

    if (voted === desired) return;

    let newUp = up, newDown = down;
    if (voted === null && desired === 'up') newUp += 1;
    else if (voted === null && desired === 'down') newDown += 1;
    else if (voted === 'up' && desired === 'down') { newUp = Math.max(0, newUp - 1); newDown += 1; }
    else if (voted === 'down' && desired === 'up') { newDown = Math.max(0, newDown - 1); newUp += 1; }
    else if (voted === 'up' && desired === null) newUp = Math.max(0, newUp - 1);
    else if (voted === 'down' && desired === null) newDown = Math.max(0, newDown - 1);

    setVoted(desired); setUp(newUp); setDown(newDown);

    inFlightRef.current = true;
    try {
      const sendVal = desired === null ? 0 : (desired === 'up' ? 1 : -1);
      const res = await postJSON<any>('/api/vote', { postId: post.id, value: sendVal });
      if (typeof res?.up === 'number' && typeof res?.down === 'number') { setUp(res.up); setDown(res.down); }
      try { desired ? localStorage.setItem(`whistle:vote:${post.id}`, desired) : localStorage.removeItem(`whistle:vote:${post.id}`); } catch {}
    } catch (e: any) {
      try {
        const stats = await postJSON<Record<string, { up: number; down: number }>>('/api/vote/stats', { ids: [post.id] });
        setUp(stats?.[post.id]?.up ?? up); setDown(stats?.[post.id]?.down ?? down);
      } catch {}
      notify(e?.message || 'Server is busy. Try again.', 'default');
    } finally {
      inFlightRef.current = false;
    }
  }, [post, voted, up, down, notify]);

  const handleDelete = useCallback(async () => {
    if (!post) return;
    const ok = await confirm('Delete this post?', 'danger', 'Delete', 'Cancel');
    if (!ok) return;

    const tries = [
      fetch(`/api/posts?id=${post.id}`, { method: 'POST', headers: { 'x-http-method-override': 'DELETE' } }),
      fetch(`/api/posts?id=${post.id}&_method=DELETE`, { method: 'POST' }),
      fetch(`/api/posts?id=${post.id}`, { method: 'DELETE' }),
    ];
    for (const req of tries) {
      try { const res = await req; if (res.ok) { router.push('/'); return; } } catch {}
    }
    notify('Could not delete the post. Please try again.', 'default');
  }, [post, router, confirm, notify]);

  const mediaUrl = post?.mediaUrl ?? null;
  const title = post?.title ?? '';
  const caption = (post?.body ?? post?.content ?? '') as string;

  const share = async () => {
    if (!post?.id) return;
    const url = typeof window !== 'undefined' ? location.origin + `/post/${post.id}` : `/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Whistle', url });
      else { await navigator.clipboard.writeText(url); notify('Link copied to clipboard.', 'default'); }
    } catch {}
  };

  return (
    <>
      <Head><title>{post ? `${post.title} • Whistle` : 'Post • Whistle'}</title></Head>

      <div className="whp mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4 text-sm">
          <Link href="/" className="inline-flex items-center gap-2 whp-link">
            <ArrowLeft size={16} /> Back to Feed
          </Link>
        </div>

        {loading && <div className="whp-state">Loading…</div>}
        {error && <div className="whp-state whp-error">{error}</div>}

        {!loading && !error && post && (
          <article>
            <header className="mb-3">
              <div className="whp-subtle">r/{post.subforumName ?? 'General'}</div>
              <h1 className="whp-title">{post.title}</h1>
              {post.createdAt && (<div className="whp-stamp whp-subtle">{ICON.bullet} {timeAgo(post.createdAt)}</div>)}
            </header>

            {caption && <div className="whp-body mb-3">{caption}</div>}
            <PostMedia mediaUrl={mediaUrl} alt={title} />

            {/* ACTION ROW */}
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <button className={`chip${voted === 'up' ? ' active' : ''}`} onClick={() => vote(+1)} aria-label="Like" title="Like" style={{ padding: '6px 10px' }}>
                <span aria-hidden>{ICON.like}</span><span>Like</span>
              </button>
              <button className={`chip${voted === 'down' ? ' active' : ''}`} onClick={() => vote(-1)} aria-label="Dislike" title="Dislike" style={{ padding: '6px 10px' }}>
                <span aria-hidden>{ICON.dislike}</span><span>Dislike</span>
              </button>
              <a href="#comments" className="chip" title="Comments" aria-label="Comments" style={{ padding: '6px 10px', textDecoration: 'none' }}>
                <span aria-hidden>{ICON.comment}</span><span>Comments</span>
              </a>
              <button className="chip" onClick={share} title="Share" aria-label="Share" style={{ padding: '6px 10px' }}>
                <span aria-hidden>{ICON.link}</span><span>Share</span>
              </button>

              <span className="meta-pill" style={{ marginLeft: 'auto' }} title="Likes">{ICON.like} {up}</span>
              <span className="meta-pill" title="Dislikes">{ICON.dislike} {down}</span>

              {/* Post-level Save */}
              <InlineSaveButton postId={post.id} notify={notify} />

              {isOwner && (
                <button className="chip" onClick={handleDelete} title="Delete post" aria-label="Delete post">
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Comments */}
            <div id="comments" className="mt-8">
              <CommentSectionInline postId={post.id} confirm={confirm} notify={notify} />
            </div>
          </article>
        )}
      </div>

      {/* Global styles */}
      <style jsx global>{`
        .whp{
          --emerald:#22C55E; --emerald-weak:rgba(34,197,94,.12);
          --rose:#f43f5e; --text:#e5e7eb; --text-subtle:#9ca3af;
          --panel:rgba(17,24,39,.3); --panel-ring:#0b1220; color:var(--text);
        }
        .whp .whp-link{color:var(--emerald)!important}
        .whp .whp-link:hover{text-decoration:underline!important}
        .whp .whp-state{background:rgba(255,255,255,.04)!important;padding:16px;border-radius:12px}
        .whp .whp-error{background:rgba(244,63,94,.12)!important;color:#fecaca!important}
        .whp .whp-title{font-weight:800;font-size:22px;line-height:1.25;color:#f3f4f6;margin-top:4px}
        .whp .whp-subtle{color:var(--text-subtle)!important;font-size:12px;font-weight:600;letter-spacing:.02em}
        .whp .whp-stamp{margin-top:4px}
        .whp .whp-media-wrap{background:var(--panel);border-radius:14px;padding:8px;outline:1px solid var(--panel-ring)}
        .whp .whp-media{display:block;width:100%;max-height:66vh;height:auto;border-radius:10px;object-fit:contain}
        .whp .whp-body{color:var(--text);white-space:pre-wrap;line-height:1.6}
        .whp .whp-editor{width:100%;min-height:96px;padding:12px;border-radius:10px;border:1px solid transparent!important;background:rgba(255,255,255,.02)!important;color:var(--text)!important}
        .whp .whp-editor::placeholder{color:var(--text-subtle)!important}
        .whp .whp-editor:focus{outline:2px solid var(--emerald)!important;outline-offset:0!important}
        .whp .whp-row{display:flex;align-items:flex-start;gap:8px}
        .whp .whp-meta{display:flex;align-items:center;gap:6px;line-height:1}
        .whp .whp-dot{color:var(--text-subtle);user-select:none}
        .whp .whp-username{font-size:14px;font-weight:700;color:#f3f4f6}
        .whp .whp-time{font-size:12px;color:#e5e7eb}
        .whp .whp-thread{margin-left:22px;padding-left:12px;border-left:1px solid rgba(148,163,184,.15)!important}
      `}</style>

      <DialogHost dialog={dialog} close={closeDialog} />
    </>
  );
}

/* ---------- Media ---------- */
const PostMedia = memo(function PostMediaBase({ mediaUrl, alt }: { mediaUrl: string | null; alt?: string }) {
  if (!mediaUrl) {
    return (
      <div className="whp-media-wrap" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:160,borderStyle:'dashed',borderWidth:1,borderColor:'rgba(148,163,184,.35)',background:'rgba(255,255,255,.02)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,color:'#9ca3af'}}>
          <div style={{width:40,height:40,borderRadius:9999,border:'1px solid rgba(148,163,184,.35)',display:'grid',placeItems:'center'}}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 5h16v14H4zM4 16l4-4 3 3 5-5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
          </div>
          <span>No media attached</span>
        </div>
      </div>
    );
  }
  return (
    <div className="whp-media-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl} alt={alt ?? 'Post image'} className="whp-media" loading="lazy" />
    </div>
  );
});

/* ---------- Post Save (post-level only) ---------- */
function InlineSaveButton({ postId, notify }: { postId: string; notify: (m: string, t?: 'default'|'danger', cLabel?: string) => Promise<void> }) {
  const key = (id: string) => `whistle:save:${id}`;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setSaved(localStorage.getItem(key(postId)) === '1'); } catch {}
    (async () => {
      try {
        const r = await fetch(`/api/saved?postId=${encodeURIComponent(postId)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await safeJson<any>(r);
        if (j && typeof j.saved === 'boolean') setSaved(!!j.saved);
      } catch {}
    })();
  }, [postId]);

  const toggle = useCallback(async () => {
    if (busy) return;
    const next = !saved;
    setBusy(true);
    setSaved(next);
    try { localStorage.setItem(key(postId), next ? '1' : '0'); } catch {}
    try {
      const res = await fetch('/api/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ postId, action: 'toggle' }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setSaved(!next);
      try { localStorage.setItem(key(postId), !next ? '1' : '0'); } catch {}
      notify('Save failed.');
    } finally { setBusy(false); }
  }, [busy, postId, saved, notify]);

  return (
    <button className={`chip${saved ? ' active' : ''}`} onClick={toggle} title={saved ? 'Saved' : 'Save'}>
      <span aria-hidden>{ICON.save}</span><span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}

/* ================= COMMENTS ================= */
type CommentNode = {
  id: string;
  content: string;
  userEmail: string | null;
  userName?: string | null;
  createdAt?: string;
  parentId?: string | null;
  children?: CommentNode[];
  replies?: CommentNode[];
};

function normalizeNode(n: CommentNode): CommentNode {
  const kids = (n.children ?? n.replies ?? []).map(normalizeNode);
  return { ...n, children: kids };
}
function normalizeTree(nodes?: CommentNode[]): CommentNode[] {
  return (nodes ?? []).map(normalizeNode);
}
const getChildren = (n: CommentNode) => n.children ?? [];

async function apiFetchComments(postId: string): Promise<CommentNode[]> {
  let res = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) {
    res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`, { cache: 'no-store', credentials: 'same-origin' });
  }
  if (!res.ok) return [];
  const data = await safeJson<any>(res);
  const list: CommentNode[] = Array.isArray(data) ? data : data?.items ?? data?.tree ?? data?.comments ?? [];
  return normalizeTree(list);
}
async function apiCreate(postId: string, content: string, parentId?: string) {
  const payload = parentId ? { content, parentId } : { content };
  let res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch(`/api/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ postId, ...payload }),
    });
  }
  if (!res.ok) throw new Error(`Failed to post comment (${res.status})`);
}
async function apiEdit(postId: string, id: string, content: string) {
  let res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-http-method-override': 'PATCH' }, credentials: 'same-origin', body: JSON.stringify({ id, content }),
  });
  if (!res.ok) {
    res = await fetch(`/api/comments`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, content }),
    });
  }
  if (!res.ok) throw new Error(`Failed to edit comment (${res.status})`);
}
async function apiDelete(postId: string, id: string) {
  let res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-http-method-override': 'DELETE' }, credentials: 'same-origin', body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    res = await fetch(`/api/comments`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }),
    });
  }
  if (!res.ok) throw new Error(`Failed to delete comment (${res.status})`);
}

/* ------- COMMENT SECTION -------- */
function CommentSectionInline({ postId, confirm, notify }: {
  postId: string;
  confirm: (m: string, t?: DialogTone, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  notify: (m: string, t?: DialogTone, cLabel?: string) => Promise<void>;
}) {
  const { data: session } = useSession();
  const me = useMemo(() => (session?.user?.email || '').trim().toLowerCase(), [session?.user?.email]);

  const [tree, setTree] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [composer, setComposer] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setTree(await apiFetchComments(postId)); }
    catch (e: any) { setErr(e?.message ?? 'Failed to load comments'); }
    finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { if (postId) load(); }, [postId, load]);

  const sendRoot = async () => {
    const text = composer.trim(); if (!text) return;
    setComposer('');
    try { await apiCreate(postId, text); await load(); }
    catch (e: any) { setComposer(text); notify(e?.message || 'Could not post comment.', 'default'); }
  };

  return (
    <section>
      <div>
        <textarea className="whp whp-editor" value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Write a comment…" rows={3} />
        <div className="mt-2 flex items-center justify-end">
          <button className="chip" onClick={sendRoot}><span aria-hidden>{ICON.comment}</span><span>Add a comment</span></button>
        </div>
      </div>

      {loading && <div className="whp-subtle mt-3">Loading comments…</div>}
      {err && <div className="mt-3" style={{ color: '#fecaca' }}>{err}</div>}

      <div className="mt-5 space-y-5">
        {tree.filter((c) => !c.parentId).map((c) => (
          <CommentCard
            key={c.id}
            node={c}
            me={me}
            postId={postId}
            onRefresh={load}
            confirm={confirm}
            notify={notify}
          />
        ))}
      </div>
    </section>
  );
}

function CommentCard({
  node, me, postId, onRefresh, confirm, notify,
}: {
  node: CommentNode;
  me: string;
  postId: string;
  onRefresh: () => Promise<void> | void;
  confirm: (m: string, t?: DialogTone, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  notify: (m: string, t?: DialogTone, cLabel?: string) => Promise<void>;
}) {
  const isOwner = !!node.userEmail && node.userEmail.toLowerCase() === me;

  const [isReplying, setIsReplying] = useState(false);
  const [replyValue, setReplyValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.content);

  /* Per-comment local like/dislike (NO save) */
  const [cVoted, setCVoted] = useState<'up' | 'down' | null>(null);
  const [cUp, setCUp] = useState(0);
  const [cDown, setCDown] = useState(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`whistle:c-vote:${node.id}`);
      setCVoted(v === 'up' || v === 'down' ? (v as 'up' | 'down') : null);
      setCUp(Math.max(0, Number(localStorage.getItem(`whistle:c-count:${node.id}:up`) || '0')));
      setCDown(Math.max(0, Number(localStorage.getItem(`whistle:c-count:${node.id}:down`) || '0')));
    } catch {}
  }, [node.id]);

  const persistCounts = (up: number, down: number) => {
    setCUp(up); setCDown(down);
    try {
      localStorage.setItem(`whistle:c-count:${node.id}:up`, String(Math.max(0, up|0)));
      localStorage.setItem(`whistle:c-count:${node.id}:down`, String(Math.max(0, down|0)));
    } catch {}
  };

  const voteComment = (val: 1 | -1) => {
    const desired: 'up' | 'down' | null =
      (cVoted === 'up' && val === 1) ? null :
      (cVoted === 'down' && val === -1) ? null :
      (val === 1 ? 'up' : 'down');

    if (desired === cVoted) return;

    let up = cUp, down = cDown;
    if (cVoted === null && desired === 'up') up += 1;
    else if (cVoted === null && desired === 'down') down += 1;
    else if (cVoted === 'up' && desired === null) up = Math.max(0, up - 1);
    else if (cVoted === 'down' && desired === null) down = Math.max(0, down - 1);
    else if (cVoted === 'up' && desired === 'down') { up = Math.max(0, up - 1); down += 1; }
    else if (cVoted === 'down' && desired === 'up') { down = Math.max(0, down - 1); up += 1; }

    setCVoted(desired);
    try { desired ? localStorage.setItem(`whistle:c-vote:${node.id}`, desired) : localStorage.removeItem(`whistle:c-vote:${node.id}`); } catch {}
    persistCounts(up, down);
  };

  const commitReply = async () => {
    const text = replyValue.trim(); if (!text) return;
    setReplyValue('');
    try { await apiCreate(postId, text, node.id); setIsReplying(false); await onRefresh(); }
    catch (e:any) { setReplyValue(text); notify(e?.message || 'Could not add reply.', 'default'); }
  };

  const commitEdit = async () => {
    const text = editValue.trim(); if (!text) return;
    try { await apiEdit(postId, node.id, text); setIsEditing(false); await onRefresh(); }
    catch (e:any) { notify(e?.message || 'Could not save edit.', 'default'); }
  };

  const commitDelete = async () => {
    const ok = await confirm('Delete this comment?', 'danger', 'Delete', 'Cancel');
    if (!ok) return;
    try { await apiDelete(postId, node.id); await onRefresh(); }
    catch (e:any) { notify(e?.message || 'Could not delete comment.', 'default'); }
  };

  const initials = (node.userName || node.userEmail || 'U').trim().slice(0, 1).toUpperCase() || 'U';
  const timestamp = node.createdAt ? new Date(node.createdAt).toLocaleString() : '';

  return (
    <div>
      <div className="whp-row">
        <div style={{ width:28, height:28, borderRadius:9999, background:'#22C55E', color:'#0b1220', fontWeight:800, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="whp-meta">
            <span className="whp-username">{node.userName || node.userEmail || 'User'}</span>
            {timestamp && (<><span className="whp-dot">•</span><span className="whp-time">{timestamp}</span></>)}
          </div>

          {!isEditing ? (
            <p style={{ marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{node.content}</p>
          ) : (
            <div style={{ marginTop: 8 }}>
              <textarea className="whp whp-editor" value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} />
              <div className="mt-2 flex items-center gap: 4px; flex-wrap: wrap">
                <button className="chip" onClick={commitEdit}><span aria-hidden>{ICON.edit}</span><span>Save</span></button>
                <button className="chip" onClick={() => { setIsEditing(false); setEditValue(node.content); }}><span aria-hidden>✖️</span><span>Cancel</span></button>
              </div>
            </div>
          )}

          {/* Comment action row — chips like the homepage (no Save) */}
          <div className="mt-2 flex items-center gap-4 flex-wrap">
            <button className={`chip${cVoted === 'up' ? ' active' : ''}`} onClick={() => voteComment(+1)}>
              <span aria-hidden>{ICON.like}</span><span>Like</span>
            </button>
            <button className={`chip${cVoted === 'down' ? ' active' : ''}`} onClick={() => voteComment(-1)}>
              <span aria-hidden>{ICON.dislike}</span><span>Dislike</span>
            </button>

            <button className="chip" onClick={() => setIsReplying((v) => !v)}><span aria-hidden>{ICON.reply}</span><span>Reply</span></button>

            {isOwner && (
              <>
                <button className="chip" onClick={() => setIsEditing((v) => !v)}><span aria-hidden>{ICON.edit}</span><span>Edit</span></button>
                <button className="chip" onClick={commitDelete}><span aria-hidden>{ICON.del}</span><span>Delete</span></button>
              </>
            )}

            <span className="meta-pill" style={{ marginLeft: 'auto' }} title="Comment likes">{ICON.like} {cUp}</span>
            <span className="meta-pill" title="Comment dislikes">{ICON.dislike} {cDown}</span>
          </div>

          {getChildren(node).length > 0 && (
            <div className="whp-thread mt-3">
              {getChildren(node).map((child) => (
                <CommentCard
                  key={child.id}
                  node={child}
                  me={me}
                  postId={postId}
                  onRefresh={onRefresh}
                  confirm={confirm}
                  notify={notify}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
