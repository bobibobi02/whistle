// apps/web/pages/create.tsx
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useMemo, useRef, useState } from "react";

type FormState = {
  title: string;
  content: string;
  subforumName: string;
  mediaUrl: string; // hidden; set after upload
};

const TITLE_MAX = 120;
const CONTENT_MAX = 10_000;

export default function CreatePostPage() {
  const router = useRouter();

  const [f, setF] = useState<FormState>({
    title: "",
    content: "",
    subforumName: "General",
    mediaUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const titleLeft = useMemo(() => TITLE_MAX - f.title.length, [f.title.length]);
  const contentLeft = useMemo(() => CONTENT_MAX - f.content.length, [f.content.length]);

  const canSubmit = useMemo(() => {
    if (busy || uploading) return false;
    const hasSomething = !!f.title.trim() || !!f.content.trim() || !!f.mediaUrl.trim();
    const okTitle = f.title.length <= TITLE_MAX;
    const okContent = f.content.length <= CONTENT_MAX;
    return hasSomething && okTitle && okContent;
  }, [busy, uploading, f]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: f.title.trim() || null,
          content: f.content.trim() || null,
          mediaUrl: f.mediaUrl.trim() || null,
          subforumName: f.subforumName.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);

      const id = json?.id || json?.item?.id || json?.post?.id;
      if (!id) throw new Error("Created, but no id returned.");

      try { localStorage.setItem("whistle:posts-mutated", String(Date.now())); } catch {}
      router.push(`/post/${id}`);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
      setBusy(false);
    }
  }

  // ---- Upload handling ----
  async function handleFileSelect(file: File) {
    setUploadError("");
    if (!file) return;

    const isImage = /^image\//i.test(file.type);
    if (!isImage) { setUploadError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Image is too large (max 10 MB)."); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Upload failed (${res.status})`);
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { url: text }; }
      const url: string =
        data?.url ??
        data?.location ??
        (Array.isArray(data?.urls) ? data.urls[0] : null) ??
        (typeof data === "string" ? data : "") ??
        "";
      if (!url) throw new Error("Upload succeeded but no URL returned.");
      setF((s) => ({ ...s, mediaUrl: url }));
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Head><title>Create post — Whistle</title></Head>

      {/* centered card */}
      <main style={{ minHeight: "calc(100vh - 88px)", display: "grid", placeItems: "start center", padding: "22px 14px" }}>
        <form onSubmit={onSubmit} className="post-card" style={{ width: "min(46rem, 100%)" }}>
          <h1 style={{ fontWeight: 800, fontSize: 22, margin: "0 0 12px" }}>Create a post</h1>

          {err && (
            <div className="post-content" role="alert" style={{ border: "1px solid #b91c1c", borderRadius: 10, padding: 10, color: "#ef4444" }}>
              {err}
            </div>
          )}

          {/* Title */}
          <label className="post-content" style={{ display: "block", marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>Title (optional)</span>
              <small className="small-muted">{titleLeft} left</small>
            </div>
            <input
              value={f.title}
              onChange={(e) => setF((s) => ({ ...s, title: e.target.value.slice(0, TITLE_MAX + 1) }))}
              placeholder="Catchy headline"
              className="input"
              maxLength={TITLE_MAX + 1}
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          {/* Content */}
          <label className="post-content" style={{ display: "block", marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>Text (optional)</span>
              <small className="small-muted">{contentLeft} left</small>
            </div>
            <textarea
              value={f.content}
              onChange={(e) => setF((s) => ({ ...s, content: e.target.value.slice(0, CONTENT_MAX + 1) }))}
              placeholder="Say something…"
              rows={6}
              className="input"
              style={{ width: "100%", marginTop: 6, resize: "vertical" }}
              maxLength={CONTENT_MAX + 1}
            />
            <small className="small-muted">Tip: you can post with just a title, just text, or just an image.</small>
          </label>

          {/* Image uploader */}
          <div className="post-content" style={{ display: "block", marginTop: 12 }}>
            <span>Image (optional)</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <button
                type="button"
                className="chip"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Choose image"
              >
                {uploading ? "Uploading…" : "Choose image"}
              </button>
              {f.mediaUrl && (
                <span className="meta-pill" title={f.mediaUrl} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Selected
                </span>
              )}
            </div>

            {uploadError && <div className="small-muted" style={{ color: "#ef4444", marginTop: 6 }}>{uploadError}</div>}

            {f.mediaUrl && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.mediaUrl} alt="" style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "contain", background: "rgba(255,255,255,0.02)" }} />
              </div>
            )}
          </div>

          {/* Loop (was Subforum) */}
          <label className="post-content" style={{ display: "block", marginTop: 12 }}>
            <span>Loop</span>
            <input
              value={f.subforumName}
              onChange={(e) => setF((s) => ({ ...s, subforumName: e.target.value }))}
              placeholder="General"
              className="input"
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
            <button className="btn-solid" disabled={!canSubmit || busy} type="submit">
              {busy ? "Posting…" : "Post"}
            </button>
            <span className="small-muted">Must include at least one of: title, text, or image.</span>
          </div>
        </form>
      </main>
    </>
  );
}
