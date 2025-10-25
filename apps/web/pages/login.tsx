'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

function mapAuthError(code?: string | string[] | null): string | null {
  const c = Array.isArray(code) ? code[0] : code;
  switch (c) {
    case 'CredentialsSignin':
      return 'Sign in failed. Check your email and password.';
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
      return 'Sign in with provider failed.';
    case 'EmailCreateAccount':
    case 'EmailSignin':
      return 'Email sign-in failed.';
    case 'CallbackRouteError':
      return 'Authentication callback error.';
    case 'AccessDenied':
      return 'Access denied.';
    case 'Configuration':
      return 'Auth configuration error.';
    case 'Verification':
      return 'Verification failed or expired.';
    default:
      return c ? 'Sign in failed. Please try again.' : null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const callbackUrl = useMemo(
    () => (typeof router.query.callbackUrl === 'string' && router.query.callbackUrl) || '/feed',
    [router.query.callbackUrl]
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If redirected here with ?error=..., show a friendly message
  useEffect(() => {
    setError(mapAuthError(router.query.error as string | undefined));
  }, [router.query.error]);

  // If already signed in, bounce to callbackUrl
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false, // we handle navigation
      callbackUrl,
    });

    setBusy(false);

    if (res?.error) {
      setError(mapAuthError(res.error) || 'Sign in failed. Check your email and password.');
      return;
    }

    // Prefer server-provided url if any
    router.replace((res?.url as string) || callbackUrl);
  }

  const isDisabled = busy || !email || !password;

  return (
    <div style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 20,
          borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(21,27,34,0.75), rgba(16,21,27,0.78))',
          outline: '1px solid rgba(120,160,180,0.08)',
          boxShadow: '0 10px 28px rgba(0,0,0,.35)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Welcome back</h1>
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              onKeyDown={e => {
                if (e.key === 'Enter' && !isDisabled) {
                  (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                }
              }}
            />
          </label>

          {error && (
            <div
              role="alert"
              style={{
                color: '#fecaca',
                background: 'rgba(239,68,68,.15)',
                border: '1px solid rgba(239,68,68,.35)',
                borderRadius: 12,
                padding: '8px 10px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-solid"
            disabled={isDisabled}
            aria-busy={busy}
            style={{ opacity: isDisabled ? 0.7 : 1 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 14, color: '#98a6ad', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>
            New here?{' '}
            <Link href="/register" style={{ color: '#9FE6B2', fontWeight: 700 }}>
              Create an account
            </Link>
          </span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>
            <Link href="/forgot" style={{ color: '#9FE6B2' }}>
              Forgot password?
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
