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
  affiliateClicks: number;
  recentActivity: { id: string; action?: string; resourceType?: string; createdAt?: string }[];
};

export function DashboardPanel({ onCreateArticle }: { onCreateArticle: () => void }) {
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
        <article><span>Total articles</span><strong>{dash.totalArticles}</strong></article>
        <article><span>Published</span><strong>{dash.published}</strong></article>
        <article><span>Drafts</span><strong>{dash.drafts}</strong></article>
        <article><span>In review</span><strong>{dash.inReview}</strong></article>
        <article><span>Scheduled</span><strong>{dash.scheduled}</strong></article>
        <article><span>Archived</span><strong>{dash.archived}</strong></article>
        <article><span>Missing translations</span><strong>{dash.missingTranslations}</strong></article>
        <article><span>Pending comments</span><strong>{dash.pendingComments}</strong></article>
        <article><span>Spam comments</span><strong>{dash.spamComments}</strong></article>
        <article><span>Media files</span><strong>{dash.mediaCount}</strong></article>
        <article><span>Affiliate clicks</span><strong>{dash.affiliateClicks}</strong></article>
      </section>
      <section className="admin-panel welcome-panel">
        <div>
          <p className="micro-label">Quick action</p>
          <h2>Create a bilingual article</h2>
          <p>Use the TipTap editor with independent Arabic and English statuses.</p>
          <button type="button" onClick={onCreateArticle}>
            New article <span>→</span>
          </button>
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
    </div>
  );
}
