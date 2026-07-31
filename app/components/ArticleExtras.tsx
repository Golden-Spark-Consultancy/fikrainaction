"use client";

import { useEffect, useState } from "react";

export function ArticleExtras() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = document.getElementById("main-content");
      if (!el) return;
      const total = el.scrollHeight - window.innerHeight;
      const value = total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 0;
      setProgress(value);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="article-progress" aria-hidden="true">
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}
