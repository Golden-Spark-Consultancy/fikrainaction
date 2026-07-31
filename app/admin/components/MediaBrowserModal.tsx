"use client";

import { useEffect } from "react";
import {
  MediaLibraryPanel,
  type MediaSelectPayload,
} from "../panels/MediaLibraryPanel";

export type { MediaSelectPayload };

type MediaBrowserModalProps = {
  open: boolean;
  title?: string;
  imagesOnly?: boolean;
  selectLabel?: string;
  onClose: () => void;
  onSelect: (asset: MediaSelectPayload) => void;
};

/** WordPress-style media library popup: browse server files or upload new ones. */
export function MediaBrowserModal({
  open,
  title = "Media library",
  imagesOnly = true,
  selectLabel = "Use image",
  onClose,
  onSelect,
}: MediaBrowserModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="media-browser-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="media-browser-backdrop"
        aria-label="Close media library"
        onClick={onClose}
      />
      <div className="media-browser-panel">
        <header className="media-browser-head">
          <div>
            <p className="micro-label">Media</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <MediaLibraryPanel
          variant="picker"
          imagesOnly={imagesOnly}
          selectLabel={selectLabel}
          autoSelectUploaded={false}
          onSelect={(asset) => {
            onSelect(asset);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
