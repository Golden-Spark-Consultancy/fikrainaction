"use client";

import { useEffect, useState } from "react";

type Props = {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
};

export function CodeBlock({
  code,
  language = "plaintext",
  filename,
  showLineNumbers = true,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      try {
        const { codeToHtml } = await import("shiki");
        const result = await codeToHtml(code, {
          lang: language === "plaintext" ? "text" : language,
          theme: "github-dark",
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml(null);
      }
    }
    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `snippet.${language}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const lines = code.split("\n");

  return (
    <figure className="code-block-figure" dir="ltr" lang="en">
      <figcaption className="code-block-meta">
        <span>{filename || language}</span>
        <span className="cookie-actions">
          <button type="button" className="btn-secondary" onClick={copy} aria-label="Copy code">
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="btn-secondary" onClick={download} aria-label="Download code">
            Download
          </button>
        </span>
      </figcaption>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="code-block" data-language={language} data-filename={filename}>
          <code>
            {showLineNumbers
              ? lines.map((line, index) => (
                  <span key={index} className="code-line">
                    <span className="line-number" aria-hidden="true">
                      {index + 1}
                    </span>
                    {line}
                    {"\n"}
                  </span>
                ))
              : code}
          </code>
        </pre>
      )}
    </figure>
  );
}
