export function sanitizeHtml(html) {
  if (!html) return ""
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br/>")
}

export function sanitizeRichText(html) {
  if (!html) return ""
  const allowedTags = ["b", "i", "u", "strong", "em", "br", "p", "ul", "ol", "li", "a", "s", "code", "pre", "span", "h1", "h2", "h3", "h4", "h5", "h6"]
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<(\/?)(\w+)[^>]*>/g, (match, close, tag) => {
      if (allowedTags.includes(tag.toLowerCase())) {
        return match.replace(/(\s(?:style|class|id|data-\w+)=["'][^"']*["'])/gi, "")
      }
      return ""
    })
    .replace(/\n/g, "<br/>")
}
