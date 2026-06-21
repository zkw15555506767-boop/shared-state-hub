const SECRET_PATTERNS = [
  /\b(sk-[A-Za-z0-9_-]{20,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{20,})\b/g,
  /\b(gh[pousr]_[A-Za-z0-9_]{20,})\b/g,
  /\b((?:api[_-]?key|token|secret|password|passwd|cookie)\s*[:=]\s*)([^\s"'`]+)\b/gi,
  /\b(Authorization\s*:\s*Bearer\s+)([^\s"'`]+)\b/gi
];

export function redactText(value) {
  let text = String(value ?? "");

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (...parts) => {
      if (parts.length >= 4 && typeof parts[1] === "string") {
        return `${parts[1]}[REDACTED]`;
      }
      return "[REDACTED]";
    });
  }

  return text;
}

export function truncateText(value, maxLength = 1800) {
  const text = redactText(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}… [truncated ${text.length - maxLength} chars]`;
}
