import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "sub", "sup", "a", "ul", "ol", "li",
  "blockquote", "h2", "h3", "h4", "h5", "h6", "pre", "code", "img", "figure",
  "figcaption", "table", "thead", "tbody", "tr", "th", "td", "hr", "div", "span",
  "button", "iframe", "mark", "input",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "id", "target", "rel", "width", "height",
  "loading", "decoding", "data-language", "data-filename", "data-lines",
  "data-affiliate", "data-callout", "allow", "allowfullscreen", "frameborder",
  "referrerpolicy", "type", "checked", "disabled", "aria-label", "role",
];

/** Legacy HTML sanitizer kept for existing content paths. */
export function sanitizeHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b(?![^>]*(?:youtube\.com|youtube-nocookie\.com)\/embed|[^>]*player\.vimeo\.com\/video)[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "");
}

/** Strict DOMPurify sanitization for TipTap-rendered HTML. */
export function sanitizeRichHtml(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ["script", "style", "object", "embed", "form", "link", "meta"],
    FORBID_ATTR: ["style"],
  });

  return cleaned
    .replace(
      /<iframe\b(?![^>]*(?:youtube-nocookie\.com)\/embed)[^>]*>[\s\S]*?<\/iframe>/gi,
      "",
    )
    .replace(
      /(<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*)(>)/gi,
      (match, start, end) => {
        if (/rel=/i.test(match)) return match;
        return `${start} rel="noopener noreferrer"${end}`;
      },
    );
}

export function youtubeEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || null;
      else id = url.searchParams.get("v");
    }
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

export function extractPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
