"use client";

import { useEffect, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";

type Dash = {
  totalArticles: number;
  published: number;
  drafts: number;
  inReview: number;
  scheduled: number;
  archived: number;
  missingTranslations: number;
  pendingComments: number;
  spamComments: number;
  mediaCount: number;
  aiBatches?: number;
  aiFailedItems?: number;
  recentPosts?: { id: string; title?: string; status?: string; locale?: string; updatedAt?: string }[];
  recentComments?: { id: string; displayName?: string; status?: string; createdAt?: string }[];
  recentActivity: { id: string; action?: string; resourceType?: string; createdAt?: string }[];
};

export function DashboardPanel({
  onCreatePost,
  onOpenBulkAi,
  onOpenComments,
  onOpenMedia,
}: {
  onCreatePost: () => void;
  onOpenBulkAi?: () => void;
  onOpenComments?: () => void;
  onOpenMedia?: () => void;
}) {
  const [dash, setDash] = useState<Dash | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    firebaseAuthorizedFetch("/api/cms/dashboard")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setDash(data.dashboard);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed"));
  }, []);

  if (!dash) {
    return (
      <div className="admin-view">
        <section className="admin-panel">
          <div className="admin-empty">
            <strong>{message || "Loading dashboard…"}</strong>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-view">
      <section className="stat-grid">
        <article><span>Total posts</span><strong>{dash.totalArticles}</strong></article>
        <article><span>Published</span><strong>{dash.published}</strong></article>
        <article><span>Drafts</span><strong>{dash.drafts}</strong></article>
        <article><span>In review</span><strong>{dash.inReview}</strong></article>
        <article><span>Scheduled</span><strong>{dash.scheduled}</strong></article>
        <article><span>Pending comments</span><strong>{dash.pendingComments}</strong></article>
        <article><span>Media files</span><strong>{dash.mediaCount}</strong></article>
        <article><span>AI batches</span><strong>{dash.aiBatches ?? 0}</strong></article>
        <article><span>Failed AI tasks</span><strong>{dash.aiFailedItems ?? 0}</strong></article>
        <article><span>Missing translations</span><strong>{dash.missingTranslations}</strong></article>
      </section>

      <section className="admin-panel welcome-panel">
        <div>
          <p className="micro-label">Quick actions</p>
          <h2>Publish with confidence</h2>
          <p>Create a bilingual post, start bulk AI drafts, or moderate comments.</p>
          <div className="dashboard-quick-actions">
            <button type="button" onClick={onCreatePost}>New post <span>→</span></button>
            {onOpenBulkAi && (
              <button type="button" onClick={onOpenBulkAi}>Bulk AI generator</button>
            )}
            {onOpenComments && (
              <button type="button" onClick={onOpenComments}>Comments</button>
            )}
            {onOpenMedia && (
              <button type="button" onClick={onOpenMedia}>Media library</button>
            )}
          </div>
        </div>
        <div>
          <strong>Recent activity</strong>
          <ul>
            {dash.recentActivity.slice(0, 8).map((item) => (
              <li key={item.id}>
                {item.action} · {item.resourceType} · {item.createdAt}
              </li>
            ))}
          </ul>
          {!dash.recentActivity.length && <p>No audit events yet.</p>}
        </div>
      </section>

      <section className="admin-analytics-grid">
        <article className="admin-panel">
          <div className="panel-title">
            <div>
              <p className="micro-label">Editorial</p>
              <h2>Recent posts</h2>
            </div>
          </div>
          <div className="content-card-list">
            {(dash.recentPosts || []).map((post) => (
              <article key={`${post.id}-${post.locale}`}>
                <div>
                  <strong>{post.title || post.id}</strong>
                  <small>{post.locale} · {post.status} · {post.updatedAt}</small>
                </div>
              </article>
            ))}
            {!dash.recentPosts?.length && (
              <div className="admin-empty"><strong>No posts yet.</strong></div>
            )}
          </div>
        </article>
        <article className="admin-panel">
          <div className="panel-title">
            <div>
              <p className="micro-label">Moderation</p>
              <h2>Recent comments</h2>
            </div>
          </div>
          <div className="content-card-list">
            {(dash.recentComments || []).map((comment) => (
              <article key={comment.id}>
                <div>
                  <strong>{comment.displayName || "Anonymous"}</strong>
                  <small>{comment.status} · {comment.createdAt}</small>
                </div>
              </article>
            ))}
            {!dash.recentComments?.length && (
              <div className="admin-empty"><strong>No comments yet.</strong></div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
