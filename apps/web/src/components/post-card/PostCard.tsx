'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';

export interface PostCardProps {
  user: { name: string; email?: string | null };
  avatarUrl?: string | null;
  timestamp: string | Date;
  title?: string | null;
  content: string;
  mediaUrl?: string | null;         // image url (absolute or /uploads/..)
  likesCount: number;               // initial score from server/feed
  commentsCount: number;
  postId: string;
  onShare?: () => void;             // optional external share hook
}

const SAVE_EVENT = 'whistle:posts-mutated';
const TRUE = new Set(['1', 'true', 'yes', 'y', 'on', 't']);
const saveKey = (id: string) => `whistle:save:${id}`;
const readSavedLocal = (id: string) => {
  try {
    return TRUE.has(String(localStorage.getItem(saveKey(id)) ?? '').toLowerCase().trim());
  } catch {
    return false;
  }
};

function normalizeMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

export default function PostCard({
  user,
  avatarUrl,
  timestamp,
  title,
  content,
  mediaUrl,
  likesCount,
  commentsCount,
  postId,
  onShare,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Voting state
  const [score, setScore] = useState(likesCount);
  const [myVote, setMyVote] = useState<0 | 1 | -1>(0);

  // Save state
  const [saved, setSaved] = useState(false);

  // Image state
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // --- Hydrate saved + vote state from server, fallback to local to avoid flicker ---
  useEffect(() => {
    let cancelled = false;

    // Local fallback immediately
    setSaved(readSavedLocal(postId));

    // Fetch current vote totals + myVote
    (async () => {
      try {
        const r = await fetch(`/api/vote?postId=${encodeURIComponent(postId)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled && typeof j?.score === 'number') {
            setScore(j.score);
            if (typeof j?.myVote === 'number' && [-1, 0, 1].includes(j.myVote)) {
              setMyVote(j.myVote);
            }
          }
        }
      } catch {
        // ignore; keep initial props
      }
    })();

    // Fetch server truth for saved (falls back to local if 404 or error)
    (async () => {
      try {
        const r = await fetch(`/api/saved?postId=${encodeURIComponent(postId)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled && typeof j?.saved === 'boolean') {
            setSaved(j.saved);
            try {
              localStorage.setItem(saveKey(postId), j.saved ? '1' : '0');
              window.dispatchEvent(new Event(SAVE_EVENT));
              localStorage.setItem(SAVE_EVENT, String(Date.now()));
            } catch {}
          }
        }
      } catch {
        // ignore; stick with local fallback
      }
    })();

    const onMut = () => setSaved(readSavedLocal(postId));
    window.addEventListener(SAVE_EVENT, onMut as EventListener);
    window.addEventListener('storage', onMut as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(SAVE_EVENT, onMut as EventListener);
      window.removeEventListener('storage', onMut as EventListener);
    };
  }, [postId]);

  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  const isLong = (content ?? '').length > 150;
  const display = expanded || !isLong ? content : `${content.slice(0, 150)}…`;
  const username = user?.name || (user?.email ? user.email.split('@')[0] : 'user');

  // --- Voting: toggle upvote; if already upvoted -> clear (value: 0)
  async function handleLike() {
    const nextValue: 0 | 1 = myVote === 1 ? 0 : 1;

    // optimistic
    const prevScore = score;
    const prevMy = myVote;
    const newScore = prevScore + (nextValue - prevMy);
    setScore(newScore);
    setMyVote(nextValue);

    try {
      const r = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ postId, value: nextValue }),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        // revert
        setScore(prevScore);
        setMyVote(prevMy);
        alert(err?.error === 'Unauthorized' ? 'Please sign in to vote.' : (err?.error || `Vote failed (${r.status})`));
        return;
      }

      const j = await r.json().catch(() => ({}));
      if (typeof j?.score === 'number') setScore(j.score);
      if (typeof j?.myVote === 'number' && [-1, 0, 1].includes(j.myVote)) setMyVote(j.myVote);
    } catch {
      // revert on network failure
      setScore(prevScore);
      setMyVote(prevMy);
      alert('Network error while voting.');
    }
  }

  // --- Save toggle with server sync (and localStorage for cross-tab)
  async function handleSave() {
    const next = !saved;
    setSaved(next);
    try {
      localStorage.setItem(saveKey(postId), next ? '1' : '0');
      window.dispatchEvent(new Event(SAVE_EVENT));
      try { localStorage.setItem(SAVE_EVENT, String(Date.now())); } catch {}

      const r = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ postId, action: next ? 'save' : 'unsave' }),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setSaved(!next);
        try { localStorage.setItem(saveKey(postId), !next ? '1' : '0'); } catch {}
        alert(err?.error === 'Unauthorized' ? 'Please sign in to save posts.' : (err?.error || `Save failed (${r.status})`));
        return;
      }

      const j = await r.json().catch(() => ({}));
      if (typeof j?.saved === 'boolean') setSaved(j.saved);
    } catch {
      setSaved(!next);
      try { localStorage.setItem(saveKey(postId), !next ? '1' : '0'); } catch {}
      alert('Network error while saving.');
    }
  }

  function handleShare() {
    if (onShare) return onShare();
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        navigator.share({ title: title ?? 'Whistle', text: content ?? '', url: `/post/${postId}` }).catch(() => {});
      } else if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`).catch(() => {});
      }
    } catch {}
  }

  return (
    <article className="post-card">
      {/* Header */}
      <div className="post-head">
        <span className="post-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl || '/icons/whistle-glow-512.png'}
            alt=""
            width={28}
            height={28}
            style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 999 }}
          />
        </span>
        <span className="post-user">{username}</span>
        <span className="post-time">• {timeAgo}</span>
        <Link href={`/post/${postId}`} className="view-link" style={{ marginLeft: 'auto' }}>
          View post →
        </Link>
      </div>

      {/* Title */}
      {title ? <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div> : null}

      {/* Text */}
      <div className="post-content">
        {display}
        {isLong && !expanded && (
          <button onClick={() => setExpanded(true)} className="link" style={{ marginLeft: 6 }}>
            Read more
          </button>
        )}
      </div>

      {/* Media (image) — only if present; otherwise there’s no box */}
      {normalizeMediaUrl(mediaUrl) ? (
        <div className="feed-media">
          <Link href={`/post/${postId}`} className="feed-media-link" aria-label="Open post">
            <div
              className="media-shell"
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(3,7,18,0.55), rgba(3,7,18,0.35))',
                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              }}
            >
              {!imgLoaded && !imgError && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, rgba(30,41,59,0.45) 0%, rgba(30,41,59,0.65) 20%, rgba(30,41,59,0.45) 40%)',
                    backgroundSize: '200% 100%',
                    animation: 'mediaShimmer 1.4s linear infinite',
                  }}
                />
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={normalizeMediaUrl(mediaUrl)!}
                alt=""
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transition: 'transform 200ms ease, opacity 180ms ease',
                  transform: imgLoaded ? 'scale(1)' : 'scale(1.01)',
                  opacity: imgLoaded ? 1 : 0.85,
                }}
              />

              <style jsx>{`
                .media-shell:hover img { transform: scale(1.015); }
                @keyframes mediaShimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
              `}</style>

              {imgError && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(180deg, rgba(12,16,24,.9), rgba(12,16,24,.7))',
                    color: '#A7B5C2',
                    fontWeight: 700,
                    letterSpacing: '.2px',
                  }}
                >
                  Image unavailable
                </div>
              )}
            </div>
          </Link>
        </div>
      ) : null}

      {/* Footer actions */}
      <div className="post-meta">
        <button className="meta-pill" title={`${score} likes`} onClick={handleLike} aria-pressed={myVote === 1}>
          <Heart size={16} /> {score}
        </button>

        <span className="meta-pill" title={`${commentsCount} comments`}>
          <MessageSquare size={16} /> {commentsCount}
        </span>

        <button className="chip" onClick={handleShare} title="Share">
          <Share2 size={16} /> Share
        </button>

        <button className="chip" onClick={handleSave} aria-pressed={saved} title={saved ? 'Unsave' : 'Save'}>
          <Bookmark size={16} /> {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  );
}
