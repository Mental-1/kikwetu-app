import { NextRequest } from "next/server";

interface RequestValidationConfig {
  /** The expected HTTP method (e.g., 'POST', 'GET') */
  method: string;
  /** List of allowed header names (case-insensitive) */
  allowedHeaders?: string[];
  /** Maximum request body size in bytes */
  maxBodySize?: number;
  /** Whether to validate Content-Type header */
  validateContentType?: boolean;
}

/**
 * Validates a Next.js HTTP request against specified method, allowed headers, and maximum body size.
 *
 * Performs checks to ensure the request uses the expected HTTP method, contains only permitted headers (if specified), and does not exceed the maximum allowed body size (if specified).
 *
 * @param request - The incoming Next.js request to validate
 * @param config - Validation configuration specifying method, allowed headers, and maximum body size
 * @returns An object with `isValid` indicating if the request passed all checks, and `errors` listing any validation failures
 */
export async function validateRequest(
  request: NextRequest,
  config: RequestValidationConfig,
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (request.method !== config.method) {
    errors.push(
      `Invalid request method. Expected ${config.method}, got ${request.method}`,
    );
  }

  if (config.allowedHeaders) {
    // Standard HTTP headers are always allowed, even if not explicitly listed
    const standardHeaders = [
      "host",
      "user-agent",
      "accept",
      "accept-encoding",
      "accept-language",
      "connection",
      "content-length",
      "content-type",
    ];
    for (const header of request.headers.keys()) {
      const lowerHeader = header.toLowerCase();
      if (
        !standardHeaders.includes(lowerHeader) &&
        !config.allowedHeaders.includes(lowerHeader)
      ) {
        errors.push(`Disallowed header: ${header}`);
      }
    }
  }

  if (config.maxBodySize && request.body) {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength) > config.maxBodySize) {
      errors.push(
        `Request body exceeds max size of ${config.maxBodySize} bytes`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
