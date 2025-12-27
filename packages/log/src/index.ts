import pino from "pino";

const MAX_STRING_LENGTH = 500;

const truncateStrings = (obj: unknown, depth = 0): unknown => {
  if (depth > 10) return "[max depth]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return obj.length > MAX_STRING_LENGTH
      ? `${obj.slice(0, MAX_STRING_LENGTH)}... [truncated ${obj.length - MAX_STRING_LENGTH} chars]`
      : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => truncateStrings(item, depth + 1));
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateStrings(value, depth + 1);
    }
    return result;
  }
  return obj;
};

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
