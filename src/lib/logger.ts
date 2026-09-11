/**
 * Sanitized server-side logger.
 * Prevents accidental logging of secrets, credentials, and tokens.
 */

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "accesskey",
  "secretaccesskey",
  "sessiontoken",
  "authorization",
  "cookie",
];

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Check if the string looks like an access key, secret, or session token
    if (value.length > 20 && (/^[A-Za-z0-9+/=_-]+$/.test(value) || value.startsWith("ops_"))) {
      // Don't redact common non-sensitive strings (like ISO dates or ARNs or UUIDs)
      if (!value.startsWith("arn:aws:") && !value.includes("T") && !value.includes("-")) {
        return `${value.slice(0, 4)}...[REDACTED]`;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        sanitized[k] = "[REDACTED]";
      } else {
        sanitized[k] = sanitizeValue(v);
      }
    }
    return sanitized;
  }

  return value;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      console.log(`[INFO] ${message}`, JSON.stringify(sanitizeValue(meta)));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  warn(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      console.warn(`[WARN] ${message}`, JSON.stringify(sanitizeValue(meta)));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : { error: String(error) };

    const payload = sanitizeValue({ ...errorDetails, ...meta });
    console.error(`[ERROR] ${message}`, JSON.stringify(payload));
  },
};
