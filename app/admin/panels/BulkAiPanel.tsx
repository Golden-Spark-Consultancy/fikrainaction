"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";

type BatchLanguage = "ar" | "en" | "both";
type BatchLength = "short" | "medium" | "long";
type AiStatus = "queued" | "researching" | "generating" | "completed" | "failed" | "cancelled";

type AiBatch = {
  id: string;
  topics: string[];
  language: BatchLanguage;
  style: string;
  audience: string;
  length: BatchLength;
  includeRecommendations: boolean;
  maxPosts: number;
  status: AiStatus;
  createdAt: string;
  updatedAt: string;
  completedCount: number;
  failedCount: number;
  totalCount: number;
};

type AiBatchItem = {
  id: string;
  batchId: string;
  topic: string;
  status: AiStatus;
  postId?: string;
  locale?: string;
  warnings?: string[];
  error?: string;
  suggestedCategory?: string;
  featuredImageStatus?: "ready" | "missing" | "placeholder";
  updatedAt: string;
};

const STATUS_LABELS: Record<AiStatus, string> = {
  queued: "Queued",
  researching: "Researching",
  generating: "Writing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const ACTIVE_STATUSES = new Set<AiStatus>(["queued", "researching", "generating"]);
const POLL_INTERVAL_MS = 3000;
const DEFAULT_MAX_POSTS = 10;
const HARD_MAX_POSTS = 25;

function parseTopicsText(text: string): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const topic = rawLine.trim();
    if (!topic || seen.has(topic.toLowerCase())) continue;
    seen.add(topic.toLowerCase());
    topics.push(topic);
  }
  return topics;
}

function parseCsvFirstColumn(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const values: string[] = [];
  lines.forEach((line, index) => {
    const firstCell = line.split(",")[0]?.trim().replace(/^"|"$/g, "");
    if (!firstCell) return;
    if (index === 0 && /^(topic|topics|title|keyword)s?$/i.test(firstCell)) return;
    values.push(firstCell);
  });
  return values;
}

export function BulkAiPanel({
  onOpenPost,
}: {
  onOpenPost?: (postId?: string, locale?: "ar" | "en") => void;
}) {
  const [topicsText, setTopicsText] = useState("");
  const [language, setLanguage] = useState<BatchLanguage>("both");
  const [length, setLength] = useState<BatchLength>("medium");
  const [style, setStyle] = useState("practical and clear");
  const [audience, setAudience] = useState("general tech-savvy readers");
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [maxPosts, setMaxPosts] = useState(DEFAULT_MAX_POSTS);

  const [confirmStep, setConfirmStep] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const [activeBatch, setActiveBatch] = useState<AiBatch | null>(null);
  const [activeItems, setActiveItems] = useState<AiBatchItem[]>([]);
  const [history, setHistory] = useState<AiBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeBatchIdRef = useRef<string | null>(null);

  const topics = parseTopicsText(topicsText);
  const estimatedCount = Math.min(topics.length, Math.max(1, maxPosts));

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await firebaseAuthorizedFetch("/api/cms/ai-batches");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load batch history.");
      setHistory(data.batches || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load batch history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const refreshBatch = useCallback(async (batchId: string) => {
    const res = await firebaseAuthorizedFetch(`/api/cms/ai-batches/${encodeURIComponent(batchId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load batch status.");
    setActiveBatch(data.batch);
    setActiveItems(data.items || []);
    return data.batch as AiBatch;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (batchId: string) => {
      stopPolling();
      activeBatchIdRef.current = batchId;
      pollRef.current = setInterval(async () => {
        try {
          const res = await firebaseAuthorizedFetch(`/api/cms/ai-batches/${encodeURIComponent(batchId)}/process`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ count: 1 }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Processing failed.");
          const batch = await refreshBatch(batchId);
          if (batch.status === "completed" || batch.status === "cancelled") {
            stopPolling();
            void loadHistory();
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Batch processing hit an error; polling stopped.");
          stopPolling();
        }
      }, POLL_INTERVAL_MS);
    },
    [refreshBatch, stopPolling, loadHistory],
  );

  useEffect(() => stopPolling, [stopPolling]);

  function removeTopicLine(topic: string) {
    setTopicsText(parseTopicsText(topicsText).filter((line) => line !== topic).join("\n"));
  }

  function onImportCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const imported = parseCsvFirstColumn(text);
      if (!imported.length) {
        setMessage("No topics were found in that CSV file.");
        return;
      }
      const merged = parseTopicsText(`${topicsText}\n${imported.join("\n")}`);
      setTopicsText(merged.join("\n"));
      setMessage(`Imported ${imported.length} topic(s) from CSV.`);
    };
    reader.readAsText(file);
  }

  async function startBatch() {
    if (!topics.length) {
      setMessage("Add at least one topic first.");
      return;
    }
    setCreating(true);
    setMessage("");
    try {
      const res = await firebaseAuthorizedFetch("/api/cms/ai-batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topics,
          language,
          style,
          audience,
          length,
          includeRecommendations,
          maxPosts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start the batch.");
      setActiveBatch(data.batch);
      setActiveItems(data.items || []);
      setConfirmStep(false);
      setTopicsText("");
      startPolling(data.batch.id);
      setMessage(`Started a batch of ${data.batch.totalCount} topic(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start the batch.");
    } finally {
      setCreating(false);
    }
  }

  async function retryItem(item: AiBatchItem) {
    if (!activeBatch) return;
    try {
      const res = await firebaseAuthorizedFetch(`/api/cms/ai-batches/${encodeURIComponent(activeBatch.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "retry", itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to retry this topic.");
      await refreshBatch(activeBatch.id);
      if (!pollRef.current) startPolling(activeBatch.id);
      setMessage(`Retrying "${item.topic}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to retry this topic.");
    }
  }

  async function cancelBatch(batchId: string) {
    if (!window.confirm("Cancel this batch? Completed drafts are kept; pending topics will stop.")) return;
    try {
      const res = await firebaseAuthorizedFetch(`/api/cms/ai-batches/${encodeURIComponent(batchId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to cancel the batch.");
      stopPolling();
      setActiveBatch(data.batch);
      await refreshBatch(batchId);
      await loadHistory();
      setMessage("Batch cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel the batch.");
    }
  }

  async function openHistoryBatch(batchId: string) {
    try {
      const batch = await refreshBatch(batchId);
      if (ACTIVE_STATUSES.has(batch.status) && !pollRef.current) startPolling(batchId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load that batch.");
    }
  }

  const overallProgress = activeBatch ? activeBatch.completedCount + activeBatch.failedCount : 0;
  const overallTotal = activeBatch?.totalCount || 0;

  return (
    <div className="admin-view">
      {!confirmStep && (
        <section className="admin-panel">
          <div className="panel-title">
            <div>
              <p className="micro-label">AI content pipeline</p>
              <h2>Bulk AI Blog Generator</h2>
            </div>
          </div>
          <p className="admin-section-intro">
            Paste or import a list of topics to research and draft as bilingual blog posts. Every draft is saved as a
            review-ready post — nothing is published automatically, and no affiliate link is ever invented.
          </p>

          <div className="form-grid">
            <label className="full-field">
              Topics (one per line)
              <textarea
                rows={8}
                value={topicsText}
                onChange={(event) => setTopicsText(event.target.value)}
                placeholder={"Best note-taking apps for students\nhttps://example.com/product-page\nHow to automate your inbox"}
              />
            </label>
            <label>
              Import topics from CSV (first column)
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportCsv(file);
                  event.target.value = "";
                }}
              />
            </label>
            <label>
              Language
              <select value={language} onChange={(event) => setLanguage(event.target.value as BatchLanguage)}>
                <option value="both">Arabic + English</option>
                <option value="ar">Arabic only</option>
                <option value="en">English only</option>
              </select>
            </label>
            <label>
              Length
              <select value={length} onChange={(event) => setLength(event.target.value as BatchLength)}>
                <option value="short">Short (~500-700 words)</option>
                <option value="medium">Medium (~900-1300 words)</option>
                <option value="long">Long (~1600-2200 words)</option>
              </select>
            </label>
            <label>
              Writing style
              <input value={style} onChange={(event) => setStyle(event.target.value)} placeholder="practical and clear" />
            </label>
            <label>
              Target audience
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="general tech-savvy readers"
              />
            </label>
            <label>
              Max posts in this batch
              <input
                type="number"
                min={1}
                max={HARD_MAX_POSTS}
                value={maxPosts}
                onChange={(event) => setMaxPosts(Math.min(HARD_MAX_POSTS, Math.max(1, Number(event.target.value) || 1)))}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={includeRecommendations}
                onChange={(event) => setIncludeRecommendations(event.target.checked)}
              />{" "}
              Include product recommendations (only real, matched affiliate links or official URLs — never invented)
            </label>
          </div>

          {topics.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3>Topics to generate ({topics.length})</h3>
              <div className="content-card-list">
                {topics.slice(0, 25).map((topic) => (
                  <article key={topic}>
                    <div>
                      <strong>{topic}</strong>
                    </div>
                    <span />
                    <a role="button" tabIndex={0} onClick={() => removeTopicLine(topic)}>
                      Remove
                    </a>
                  </article>
                ))}
              </div>
              {topics.length > 25 && <p className="admin-section-intro">…and {topics.length - 25} more.</p>}
            </div>
          )}

          <div className="editor-actions" style={{ marginTop: 20 }}>
            <button type="button" className="publish-button" disabled={!topics.length} onClick={() => setConfirmStep(true)}>
              Review &amp; start ({estimatedCount})
            </button>
          </div>
        </section>
      )}

      {confirmStep && (
        <section className="admin-panel">
          <div className="panel-title">
            <div>
              <p className="micro-label">Confirm before generating</p>
              <h2>Start this batch?</h2>
            </div>
          </div>
          <p>
            This will generate up to <strong>{estimatedCount}</strong> draft post(s) out of {topics.length} topic(s) provided,
            in <strong>{language === "both" ? "Arabic and English" : language === "ar" ? "Arabic" : "English"}</strong>, at{" "}
            <strong>{length}</strong> length. All results are saved as drafts for review — none are published automatically.
          </p>
          <div className="content-card-list">
            {topics.slice(0, maxPosts).map((topic) => (
              <article key={topic}>
                <div>
                  <strong>{topic}</strong>
                </div>
                <span />
                <span />
              </article>
            ))}
          </div>
          <div className="editor-actions" style={{ marginTop: 20 }}>
            <button type="button" onClick={() => setConfirmStep(false)}>
              Back
            </button>
            <button type="button" className="publish-button" disabled={creating} onClick={() => void startBatch()}>
              {creating ? "Starting…" : "Confirm & start generation"}
            </button>
          </div>
        </section>
      )}

      {activeBatch && (
        <section className="admin-panel">
          <div className="panel-title">
            <div>
              <p className="micro-label">Batch {activeBatch.id.slice(0, 8)}</p>
              <h2>
                Progress: {overallProgress} / {overallTotal}{" "}
                <span className={`draft-badge ${activeBatch.status}`}>{STATUS_LABELS[activeBatch.status]}</span>
              </h2>
            </div>
            {ACTIVE_STATUSES.has(activeBatch.status) && (
              <button type="button" className="danger" onClick={() => void cancelBatch(activeBatch.id)}>
                Cancel remaining
              </button>
            )}
          </div>

          <div className="content-card-list">
            {activeItems.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.topic}</strong>
                  {item.error && <small>{item.error}</small>}
                  {!item.error && item.warnings && item.warnings.length > 0 && (
                    <small>{item.warnings.length} note(s) — check the draft before publishing.</small>
                  )}
                </div>
                <span className={`draft-badge ${item.status}`}>{STATUS_LABELS[item.status]}</span>
                <span className="page-actions">
                  {item.status === "failed" && (
                    <button type="button" onClick={() => void retryItem(item)}>
                      Retry
                    </button>
                  )}
                  {item.postId && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPost?.(
                          item.postId,
                          item.locale === "en" || item.locale === "ar" ? item.locale : "ar",
                        )
                      }
                    >
                      Open draft
                    </button>
                  )}
                </span>
              </article>
            ))}
          </div>
          {message && <div className="status-message">{message}</div>}
        </section>
      )}

      {!activeBatch && message && <div className="status-message">{message}</div>}

      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="micro-label">History</p>
            <h2>Past batches</h2>
          </div>
        </div>
        {historyLoading && (
          <div className="admin-empty">
            <strong>Loading batch history…</strong>
          </div>
        )}
        {!historyLoading && !history.length && (
          <div className="admin-empty">
            <strong>No AI batches yet.</strong>
            <p>Start one above to see its progress and history here.</p>
          </div>
        )}
        {!historyLoading && history.length > 0 && (
          <div className="content-card-list">
            {history.map((batch) => (
              <article key={batch.id}>
                <div>
                  <strong>{batch.topics.slice(0, 2).join(", ")}{batch.topics.length > 2 ? `, +${batch.topics.length - 2} more` : ""}</strong>
                  <small>
                    {new Date(batch.createdAt).toLocaleString()} · {batch.language} · {batch.completedCount}/{batch.totalCount} done
                    {batch.failedCount ? ` · ${batch.failedCount} failed` : ""}
                  </small>
                </div>
                <span className={`draft-badge ${batch.status}`}>{STATUS_LABELS[batch.status]}</span>
                <button type="button" onClick={() => void openHistoryBatch(batch.id)}>
                  View batch
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
