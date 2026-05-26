import DOMPurify from "dompurify";

const allowedTags = [
  "a",
  "br",
  "strong",
  "em",
  "p",
  "ul",
  "ol",
  "li",
  "span",
  "code",
  "pre",
];

const allowedAttributes = ["href", "target", "rel"];

const allowedUri = /^(https?:|mailto:)/i;

export function sanitizeHtml(value?: string) {
  if (!value) return "";
  if (typeof window === "undefined") {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOWED_URI_REGEXP: allowedUri,
  });
}
