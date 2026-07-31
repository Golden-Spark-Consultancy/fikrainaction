import { extractPlainText, sanitizeRichHtml, youtubeEmbedUrl } from "../sanitize";

type TipTapNode = {
  type?: string;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMarks(text: string, marks?: TipTapNode["marks"]): string {
  let html = escapeHtml(text);
  if (!marks?.length) return html;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "code":
        html = `<code>${html}</code>`;
        break;
      case "superscript":
        html = `<sup>${html}</sup>`;
        break;
      case "subscript":
        html = `<sub>${html}</sub>`;
        break;
      case "highlight":
        html = `<mark>${html}</mark>`;
        break;
      case "link": {
        const href = String(mark.attrs?.href ?? "#");
        const external = /^https?:/i.test(href);
        const rel = external ? ' rel="noopener noreferrer"' : "";
        const target = external ? ' target="_blank"' : "";
        html = `<a href="${escapeHtml(href)}"${rel}${target}>${html}</a>`;
        break;
      }
      default:
        break;
    }
  }
  return html;
}

function renderInline(nodes?: TipTapNode[]): string {
  if (!nodes?.length) return "";
  return nodes
    .map((node) => {
      if (node.type === "text") return renderMarks(node.text ?? "", node.marks);
      if (node.type === "hardBreak") return "<br />";
      return renderNode(node);
    })
    .join("");
}

function slugFromHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "section";
}

function renderNode(node: TipTapNode): string {
  const kids = () => renderInline(node.content);
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(renderNode).join("");
    case "paragraph":
      return `<p>${kids()}</p>`;
    case "heading": {
      const level = Math.min(6, Math.max(2, Number(node.attrs?.level ?? 2)));
      const text = extractPlainText(kids());
      const id = slugFromHeading(text);
      return `<h${level} id="${id}">${kids()}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${(node.content ?? []).map(renderNode).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content ?? []).map(renderNode).join("")}</ol>`;
    case "taskList":
      return `<ul class="task-list">${(node.content ?? []).map(renderNode).join("")}</ul>`;
    case "listItem":
      return `<li>${kids()}</li>`;
    case "taskItem": {
      const checked = node.attrs?.checked ? " checked" : "";
      return `<li class="task-item"><input type="checkbox" disabled${checked} /> ${kids()}</li>`;
    }
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(renderNode).join("")}</blockquote>`;
    case "horizontalRule":
      return "<hr />";
    case "codeBlock": {
      const language = escapeHtml(String(node.attrs?.language ?? "plaintext"));
      const filename = node.attrs?.filename
        ? ` data-filename="${escapeHtml(String(node.attrs.filename))}"`
        : "";
      const code = escapeHtml(
        (node.content ?? []).map((n) => n.text ?? "").join(""),
      );
      return `<pre class="code-block" data-language="${language}"${filename}><code>${code}</code></pre>`;
    }
    case "image": {
      const src = escapeHtml(String(node.attrs?.src ?? ""));
      const alt = escapeHtml(String(node.attrs?.alt ?? ""));
      const title = node.attrs?.title ? ` title="${escapeHtml(String(node.attrs.title))}"` : "";
      return `<figure><img src="${src}" alt="${alt}" loading="lazy" decoding="async"${title} /><figcaption>${alt}</figcaption></figure>`;
    }
    case "youtube":
    case "iframe": {
      const raw = String(node.attrs?.src ?? node.attrs?.url ?? "");
      const embed = youtubeEmbedUrl(raw);
      if (!embed) return "";
      return `<div class="video-embed"><iframe src="${embed}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    }
    case "table":
      return `<table>${(node.content ?? []).map(renderNode).join("")}</table>`;
    case "tableRow":
      return `<tr>${(node.content ?? []).map(renderNode).join("")}</tr>`;
    case "tableHeader":
      return `<th>${kids()}</th>`;
    case "tableCell":
      return `<td>${kids()}</td>`;
    case "callout": {
      const variant = escapeHtml(String(node.attrs?.variant ?? "info"));
      return `<div class="callout callout-${variant}" data-callout="${variant}">${(node.content ?? []).map(renderNode).join("")}</div>`;
    }
    case "affiliateCard": {
      const name = escapeHtml(String(node.attrs?.name ?? "Product"));
      const href = escapeHtml(String(node.attrs?.href ?? "#"));
      const desc = escapeHtml(String(node.attrs?.description ?? ""));
      return `<aside class="affiliate-card" data-affiliate="true"><h3>${name}</h3><p>${desc}</p><a href="${href}" rel="sponsored nofollow noopener" target="_blank">Learn more</a></aside>`;
    }
    case "button": {
      const href = escapeHtml(String(node.attrs?.href ?? "#"));
      const label = escapeHtml(String(node.attrs?.label ?? "Open"));
      return `<p><a class="content-button" href="${href}" rel="noopener noreferrer">${label}</a></p>`;
    }
    default:
      return kids();
  }
}

export function renderTiptapToHtml(
  content: Record<string, unknown> | null | undefined,
  legacyHtml?: string,
): string {
  if (content && typeof content === "object") {
    const html = renderNode(content as TipTapNode);
    return sanitizeRichHtml(html);
  }
  if (legacyHtml) return sanitizeRichHtml(legacyHtml);
  return "";
}

export function extractHeadingsFromHtml(html: string): { id: string; text: string; level: number }[] {
  const matches = [...html.matchAll(/<h([2-6])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi)];
  return matches.map((m) => ({
    level: Number(m[1]),
    id: m[2],
    text: extractPlainText(m[3]),
  }));
}
