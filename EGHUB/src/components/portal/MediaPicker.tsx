import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";
import type { Profile } from "@/types/domain";

type Client = SupabaseClient<any>;

export interface MediaAssetSummary {
  id: string;
  title: string;
  kind: string;
  bucket: string;
  size_bytes: number | null;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Classify the upload from its own MIME type rather than asking staff. */
function inferKind(file: File, bucket: string, fallback: string) {
  const type = file.type || "";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/"))
    return bucket === "public-media" ? "cover" : "image";
  if (type.includes("zip")) return "bundle";
  return fallback;
}

/**
 * Attaching files used to mean uploading in a separate Media section,
 * copying the asset UUID out of a table, and pasting it into the product
 * form. This picks and uploads files in place instead, so staff never see
 * an identifier.
 */
export default function MediaPicker({
  supabase,
  profile,
  bucket,
  defaultKind,
  multiple = true,
  value,
  onChange,
  emptyLabel,
}: {
  supabase: Client;
  profile: Profile;
  bucket: "public-media" | "private-downloads" | "source-media";
  defaultKind: string;
  multiple?: boolean;
  value: string[];
  onChange: (ids: string[]) => void;
  emptyLabel: string;
}) {
  const [assets, setAssets] = useState<MediaAssetSummary[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [filter, setFilter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const load = () =>
    void supabase
      .from("media_assets")
      .select("id,title,kind,bucket,size_bytes")
      .eq("bucket", bucket)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAssets((data || []) as MediaAssetSummary[]));
  useEffect(load, [supabase, bucket]);

  const selected = value
    .map((id) => assets.find((asset) => asset.id === id))
    .filter(Boolean) as MediaAssetSummary[];
  const selectable = assets.filter(
    (asset) =>
      !value.includes(asset.id) &&
      asset.title.toLowerCase().includes(filter.toLowerCase()),
  );

  function select(id: string) {
    onChange(multiple ? [...value, id] : [id]);
    setBrowsing(false);
    setFilter("");
  }
  function deselect(id: string) {
    onChange(value.filter((current) => current !== id));
  }

  async function upload() {
    if (!file) return;
    setError("");
    if (bucket === "public-media" && !altText.trim()) {
      setError("Public files need alt text for accessibility.");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return setError("Session expired.");
    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return setError("Storage is not configured.");
    const projectRef = new URL(url).hostname.split(".")[0];
    const objectName = `${profile.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const kind = inferKind(file, bucket, defaultKind);
    setProgress(1);
    const transfer = new tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      headers: {
        authorization: `Bearer ${session.session.access_token}`,
        apikey: key,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        bucketName: bucket,
        objectName,
        contentType: file.type,
        cacheControl: "3600",
      },
      onProgress: (sent, total) =>
        setProgress(Math.max(1, Math.round((sent / total) * 100))),
      onError: (uploadError) => {
        setError(uploadError.message);
        setProgress(0);
      },
      onSuccess: async () => {
        const { data, error: insertError } = await supabase
          .from("media_assets")
          .insert({
            bucket,
            path: objectName,
            kind,
            title: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            alt_text: altText.trim() || null,
            processing_status: "ready",
            created_by: profile.id,
          })
          .select("id,title,kind,bucket,size_bytes")
          .single();
        setProgress(0);
        if (insertError || !data) {
          setError(insertError?.message || "Could not save the upload.");
          return;
        }
        setAssets((current) => [data as MediaAssetSummary, ...current]);
        onChange(multiple ? [...value, data.id] : [data.id]);
        setFile(null);
        setAltText("");
      },
    });
    transfer.start();
  }

  return (
    <div className="media-picker">
      {selected.length > 0 ? (
        <ul className="media-selected">
          {selected.map((asset) => (
            <li key={asset.id}>
              <span className="media-selected-name">{asset.title}</span>
              <span className="media-selected-meta">
                {asset.kind}
                {asset.size_bytes ? ` · ${formatSize(asset.size_bytes)}` : ""}
              </span>
              <button
                type="button"
                className="button-danger"
                onClick={() => deselect(asset.id)}
                aria-label={`Remove ${asset.title}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="media-empty">{emptyLabel}</p>
      )}

      <div className="media-actions">
        <label className="media-upload-btn">
          <span>{file ? file.name : "Choose file to upload"}</span>
          <input
            type="file"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-solid btn-sm"
          disabled={!file || progress > 0}
          onClick={() => void upload()}
        >
          {progress > 0 ? `Uploading ${progress}%` : "Upload"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setBrowsing((open) => !open)}
        >
          {browsing ? "Close library" : "Use existing file"}
        </button>
      </div>

      {file && bucket === "public-media" && (
        <input
          className="media-alt"
          placeholder="Alt text (describes the image for screen readers)"
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
        />
      )}
      {progress > 0 && <progress max={100} value={progress} />}
      {error && (
        <p className="media-error" role="alert">
          {error}
        </p>
      )}

      {browsing && (
        <div className="media-library">
          <input
            placeholder="Search uploaded files…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          {selectable.length ? (
            <ul>
              {selectable.slice(0, 25).map((asset) => (
                <li key={asset.id}>
                  <button type="button" onClick={() => select(asset.id)}>
                    <span className="media-selected-name">{asset.title}</span>
                    <span className="media-selected-meta">
                      {asset.kind}
                      {asset.size_bytes
                        ? ` · ${formatSize(asset.size_bytes)}`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="media-empty">Nothing uploaded to this bucket yet.</p>
          )}
        </div>
      )}

      <style>{`
        .media-picker{display:grid;gap:10px}
        .media-selected{list-style:none;margin:0;padding:0;display:grid;gap:6px}
        .media-selected li{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg-elev)}
        .media-selected-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .media-selected-meta{color:var(--ink-soft);font-size:.78rem}
        .media-empty{color:var(--ink-soft);font-size:.85rem;margin:0}
        .media-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
        .media-upload-btn{flex:1;min-width:180px;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--ink-soft);font-size:.85rem;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .media-upload-btn input{display:none}
        .media-alt{min-height:38px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
        .media-error{color:var(--red);font-size:.85rem;margin:0}
        .media-library{border:1px solid var(--line);border-radius:8px;padding:10px;display:grid;gap:8px;max-height:280px;overflow:auto}
        .media-library input{min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
        .media-library ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
        .media-library li button{display:flex;width:100%;align-items:center;gap:10px;padding:7px 9px;border:0;border-radius:6px;background:transparent;color:var(--ink);text-align:left;cursor:pointer}
        .media-library li button:hover{background:var(--bg-elev)}
      `}</style>
    </div>
  );
}
