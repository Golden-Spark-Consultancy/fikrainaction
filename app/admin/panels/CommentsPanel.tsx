"use client";

import { useEffect, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";

type Comment = {
  id: string;
  postId?: string;
  displayName?: string;
  body?: string;
  status?: string;
  locale?: string;
  createdAt?: string;
};

export function CommentsPanel() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await firebaseAuthorizedFetch(
      `/api/comments/moderate?status=${encodeURIComponent(filter)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to load comments");
      return;
    }
    setComments(data.comments || []);
    setSelected([]);
  }

  useEffect(() => {
    void load().catch(() => setMessage("Unable to load comments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function moderate(status: string) {
    if (!selected.length) return;
    const res = await firebaseAuthorizedFetch("/api/comments/moderate", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selected, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Moderation failed");
      return;
    }
    setMessage(`Updated ${selected.length} comment(s) to ${status}.`);
    await load();
  }

  return (
    <div className="admin-view">
      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="micro-label">Moderation</p>
            <h2>Comments</h2>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="spam">Spam</option>
            <option value="trash">Trash</option>
          </select>
        </div>
        <div className="editor-actions" style={{ marginBottom: 16 }}>
          <button type="button" onClick={() => void moderate("approved")}>Approve</button>
          <button type="button" onClick={() => void moderate("rejected")}>Reject</button>
          <button type="button" onClick={() => void moderate("spam")}>Spam</button>
          <button type="button" onClick={() => void moderate("trash")}>Trash</button>
        </div>
        <div className="content-card-list">
          {comments.map((comment) => (
            <article key={comment.id}>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={selected.includes(comment.id)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, comment.id]
                        : current.filter((id) => id !== comment.id),
                    )
                  }
                />
              </label>
              <div>
                <strong>{comment.displayName || "Anonymous"}</strong>
                <small>
                  {comment.status} · {comment.locale} · post {comment.postId}
                </small>
                <p>{comment.body}</p>
              </div>
            </article>
          ))}
        </div>
        {!comments.length && (
          <div className="admin-empty">
            <strong>No comments in this filter.</strong>
          </div>
        )}
        {message && <div className="status-message">{message}</div>}
      </section>
    </div>
  );
}
