"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BulkAiPanel } from "./panels/BulkAiPanel";
import { CommentsPanel } from "./panels/CommentsPanel";
import { DashboardPanel } from "./panels/DashboardPanel";
import { MediaLibraryPanel } from "./panels/MediaLibraryPanel";
import { PostsPanel } from "./panels/PostsPanel";
import { SiteConfigPanel } from "./panels/SiteConfigPanel";

type AdminView =
  | "dashboard"
  | "posts"
  | "bulk-ai"
  | "comments"
  | "media"
  | "site-config";

const NAV: { id: AdminView; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▣" },
  { id: "posts", label: "Posts", icon: "✎" },
  { id: "bulk-ai", label: "Bulk AI Blog Generator", icon: "✦" },
  { id: "comments", label: "Comments", icon: "💬" },
  { id: "media", label: "Media Library", icon: "▧" },
  { id: "site-config", label: "Site Configuration", icon: "☰" },
];

const TITLES: Record<AdminView, string> = {
  dashboard: "Dashboard",
  posts: "Posts",
  "bulk-ai": "Bulk AI Blog Generator",
  comments: "Comments",
  media: "Media Library",
  "site-config": "Site Configuration",
};

export function AdminStudio({
  user,
  onSignOut,
}: {
  user: { name: string; email: string };
  onSignOut: () => Promise<void>;
}) {
  const [view, setView] = useState<AdminView>("dashboard");
  const [postsKey, setPostsKey] = useState(0);
  const [openPostId, setOpenPostId] = useState<string | undefined>();
  const [openPostLocale, setOpenPostLocale] = useState<"ar" | "en" | undefined>();

  return (
    <main className="admin-shell cms-admin">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" href="/ar" aria-label="fikraInAction home">
          <Image
            src="/fikra-in-action-logo.png"
            alt="fikraInAction"
            width={64}
            height={64}
            unoptimized
            className="admin-brand-logo"
          />
          <span>
            fikraInAction
            <small>blog CMS</small>
          </span>
        </Link>
        <nav aria-label="Administration sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-user">
          <span>{user.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button type="button" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <p className="micro-label">fikraInAction CMS</p>
            <h1>{TITLES[view]}</h1>
          </div>
          <div className="admin-topbar-actions">
            <button type="button" onClick={() => setView("posts")}>
              + New post
            </button>
            <button
              type="button"
              className="secondary-topbar-btn"
              onClick={() => setView("bulk-ai")}
            >
              Bulk AI
            </button>
          </div>
        </header>

        {view === "dashboard" && (
          <DashboardPanel
            onCreatePost={() => {
              setPostsKey((k) => k + 1);
              setView("posts");
            }}
            onOpenBulkAi={() => setView("bulk-ai")}
            onOpenComments={() => setView("comments")}
            onOpenMedia={() => setView("media")}
          />
        )}
        {view === "posts" && (
          <PostsPanel
            key={postsKey}
            initialPostId={openPostId}
            initialLocale={openPostLocale}
          />
        )}
        {view === "bulk-ai" && (
          <BulkAiPanel
            onOpenPost={(postId, locale) => {
              setOpenPostId(postId);
              setOpenPostLocale(locale);
              setPostsKey((k) => k + 1);
              setView("posts");
            }}
          />
        )}
        {view === "comments" && <CommentsPanel />}
        {view === "media" && <MediaLibraryPanel />}
        {view === "site-config" && <SiteConfigPanel />}
      </section>
    </main>
  );
}
