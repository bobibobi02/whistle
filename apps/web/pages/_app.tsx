// apps/web/pages/_app.tsx
import type { AppProps } from 'next/app';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import '../styles/globals.css';
import ToastProvider from '@/components/toast';
import { DialogProvider } from '@/components/ui/DialogProvider'; // lives under components/ui

/**
 * GLOBAL SAFETY PATCHES
 * 1) Response.prototype.json(): return {} on empty/non-JSON bodies.
 * 2) Response.prototype.text(): for same-origin /api/*, return '{}' when empty.
 * 3) fetch wrapper: for same-origin /api/*, if body is empty, replace with '{}'.
 *    This prevents any "Unexpected end of JSON input" from legacy code paths.
 */
(function installNetworkGuardsOnce() {
  if (typeof window === 'undefined') return;
  // @ts-expect-error internal flags
  const w: any = window;
  if (w.__networkGuardsInstalled) return;
  w.__networkGuardsInstalled = true;

  // ----- Safe json/text on Response prototype -----
  const origJson = Response.prototype.json;
  const origText = Response.prototype.text;

  Response.prototype.json = async function patchedJson() {
    try {
      const t = await this.clone().text().catch(() => '');
      if (!t) return {} as any;
      try { return JSON.parse(t); } catch { return {} as any; }
    } catch {
      return origJson.apply(this, arguments as any);
    }
  };

  Response.prototype.text = async function patchedText() {
    try {
      const txt = await (origText.apply(this, arguments as any) as Promise<string>).catch(() => '');
      if (txt) return txt;
      const url = (this as Response).url || '';
      const sameOrigin = !/^https?:\/\//i.test(url) || url.startsWith(location.origin);
      if (sameOrigin && /\/api\//.test(url)) return '{}';
      return '';
    } catch {
      return '{}';
    }
  };

  // ----- Fetch wrapper (guarantee non-empty bodies for /api/*) -----
  const origFetch = w.fetch.bind(window) as typeof fetch;

  w.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await origFetch(input, init);

    try {
      const urlStr =
        typeof input === 'string'
          ? input
          : (input as any)?.url ?? (res as any).url ?? '';

      const sameOrigin =
        !/^https?:\/\//i.test(urlStr) || urlStr.startsWith(location.origin);

      // Only normalize our own API responses
      if (!sameOrigin || !/\/api\//.test(urlStr)) return res;

      // Peek at the body; if it's empty, replace with '{}' so ANY parser is safe
      const txt = await res.clone().text().catch(() => '');
      if (txt && txt.length > 0) return res;

      const headers = new Headers(res.headers);
      if (!headers.get('content-type')) headers.set('content-type', 'application/json');

      const safe = new Response('{}', {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
      Object.defineProperty(safe, 'url', { value: (res as any).url, writable: false });
      return safe;
    } catch {
      return res;
    }
  }) as typeof fetch;
})();

/** Hard sign-out helper (unchanged) */
async function hardSignOut(callbackUrl = '/') {
  try {
    const csrfRes = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    const { csrfToken } = await csrfRes.json();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signout';

    const csrf = document.createElement('input');
    csrf.type = 'hidden';
    csrf.name = 'csrfToken';
    csrf.value = csrfToken;

    const cb = document.createElement('input');
    cb.type = 'hidden';
    cb.name = 'callbackUrl';
    cb.value = callbackUrl;

    form.appendChild(csrf);
    form.appendChild(cb);
    document.body.appendChild(form);
    form.submit();
  } catch {
    await signOut({ callbackUrl });
  }
}

function Navbar() {
  const { status } = useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const saved =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('whistle-theme') as 'light' | 'dark' | null)) || 'dark';
    setTheme(saved);
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = saved;
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { localStorage.setItem('whistle-theme', next); } catch {}
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = next;
  };

  return (
    <header className="navbar">
      <div className="inner">
        <Link href="/" className="logo">Whistle</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
          <nav className="nav-links">
            <Link href="/feed" className="link">Feed</Link>
            <Link href="/create" className="link">Create Post</Link>
            {status === 'loading' ? (
              <span className="link" aria-hidden style={{ opacity: 0.5 }}>…</span>
            ) : status === 'authenticated' ? (
              <>
                <Link href="/profile" className="link">Profile</Link>
                <button type="button" onClick={() => hardSignOut('/')} className="link" title="Sign out">
                  Log out
                </button>
              </>
            ) : (
              <Link href="/api/auth/signin" className="link">Login</Link>
            )}
          </nav>
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <span>🌙 Dark</span> : <span>🌞 Light</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <DialogProvider>
        <ToastProvider>
          <Head>
            <title>Whistle</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Head>

          {/* Polished comment UI styles (scoped to .comment-ui) */}
          <style jsx global>{`
            :root {
              --c-border: #2e3a43;
              --c-border-strong: #536976;
              --c-soft-bg: rgba(255, 255, 255, 0.03);
              --c-soft-bg-2: rgba(255, 255, 255, 0.06);
              --c-text: #e6eef2;
              --c-text-dim: #a8c3cf;
              --c-accent: #22a162;
              --c-danger: #f36d6d;
              --c-danger-2: #7a2d2d;
              --c-glass: linear-gradient(180deg, rgba(21, 27, 34, 0.78), rgba(16, 21, 27, 0.86));
            }

            .comment-ui .comment-card {
              border-radius: 18px;
              padding: 14px 14px 12px;
              background: var(--c-glass);
              outline: 1px solid rgba(120,160,180,0.10);
              box-shadow: 0 12px 26px rgba(0,0,0,.28);
              transition: transform .15s ease, box-shadow .15s ease, outline-color .15s ease;
            }
            .comment-ui .comment-card:hover {
              transform: translateY(-1px);
              box-shadow: 0 16px 34px rgba(0,0,0,.35);
              outline-color: rgba(120,160,180,0.14);
            }

            .comment-ui .comment-header {
              display: grid;
              grid-template-columns: auto 1fr auto;
              gap: 10px;
              align-items: center;
              margin-bottom: 8px;
            }
            .comment-ui .avatar {
              width: 28px; height: 28px;
              border-radius: 9999px;
              display: inline-grid;
              place-items: center;
              color: #f4fbff;
              font-size: 12px;
              font-weight: 800;
              border: 1px solid rgba(255,255,255,.1);
              box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
            }
            .comment-ui .name-pill {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              border-radius: 9999px;
              padding: 4px 10px;
              background: rgba(17,38,28,.52);
              color: #9FE6B2;
              font-weight: 800;
              letter-spacing: .2px;
              border: 1px solid rgba(121, 235, 170, .22);
            }
            .comment-ui .time {
              color: #8FA2A8;
              font-size: 12.5px;
              font-weight: 600;
              margin-left: 8px;
            }

            .comment-ui button.chip,
            .comment-ui .chip {
              -webkit-appearance: none; appearance: none;
              background: transparent;
              border: 1px solid var(--c-border);
              color: var(--c-text);
              font: inherit;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 7px 12px;
              border-radius: 12px;
              line-height: 1;
              transition: background .15s ease, border-color .15s ease, transform .10s ease, opacity .15s ease;
            }
            .comment-ui .chip:hover { border-color: var(--c-border-strong); background: var(--c-soft-bg); transform: translateY(-1px); }
            .comment-ui .chip:disabled { opacity: .6; cursor: not-allowed; }

            .comment-ui .btn-solid {
              padding: 9px 14px;
              border-radius: 12px;
              background: var(--c-accent);
              color: #fff;
              font-weight: 800;
              box-shadow: 0 2px 0 rgba(0,0,0,.25);
              transition: filter .15s ease, transform .10s ease, opacity .15s ease;
              border: none;
            }
            .comment-ui .btn-solid:hover { filter: brightness(1.06); transform: translateY(-1px); }
            .comment-ui .btn-solid:disabled { opacity: .6; cursor: not-allowed; }

            .comment-ui .heart.liked { color: #ff6b6b; }

            .comment-ui .chip-danger { border-color: rgba(243,109,109,.35); }
            .comment-ui .chip-danger:hover { border-color: #f36d6d; background: rgba(243,109,109,.06); }

            .comment-ui .count {
              display: inline-flex;
              align-items: center;
              min-width: 16px;
              padding: 2px 6px;
              border-radius: 9999px;
              background: var(--c-soft-bg-2);
              border: 1px solid var(--c-border);
              font-size: 12px;
            }

            .comment-ui .textarea {
              width: 100%;
              padding: 10px 12px;
              border: 1px solid var(--c-border);
              border-radius: 12px;
              background: var(--c-soft-bg);
              color: var(--c-text);
              resize: vertical;
              min-height: 70px;
            }

            .comment-ui .comment-thread {
              margin-left: 16px; padding-left: 12px;
              border-left: 2px solid var(--c-soft-bg-2);
            }

            .comment-ui .actions { display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap; }

            .comment-ui .chip:focus-visible,
            .comment-ui .btn-solid:focus-visible,
            .comment-ui .textarea:focus-visible {
              outline: 2px solid #6bb1ff;
              outline-offset: 2px;
            }
          `}</style>

          <Navbar />
          <Component {...pageProps} />
        </ToastProvider>
      </DialogProvider>
    </SessionProvider>
  );
}
