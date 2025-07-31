import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

// XSS Protection
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Checks if the input string contains patterns commonly associated with SQL injection attempts.
 *
 * Returns `true` if the input does not match any SQL injection patterns, otherwise returns `false`.
 */
export function validateSqlInput(input: string): boolean {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(--|\/\*|\*\/|;)/g,
    /\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\)/gi,
  ];

  return !sqlInjectionPatterns.some((pattern) => pattern.test(input));
}

// Enhanced Zod schemas with sanitization
export const createSanitizedString = (options: {
  min?: number;
  max?: number;
  required?: boolean;
  allowHtml?: boolean;
}) => {
  let schema = z.string();

  if (options.required !== false) {
    schema = schema.min(1, "This field is required");
  }

  if (options.min) {
    schema = schema.min(
      options.min,
      `Must be at least ${options.min} characters`,
    );
  }

  if (options.max) {
    schema = schema.max(
      options.max,
      `Must be no more than ${options.max} characters`,
    );
  }

  return schema
    .transform((val) => {
      // Sanitize input
      const sanitized = options.allowHtml
        ? DOMPurify.sanitize(val)
        : sanitizeInput(val);
      return sanitized;
    })
    .refine((val) => validateSqlInput(val), {
      message: "Invalid characters detected",
    });
};

export const createSanitizedEmail = () => {
  return z
    .string()
    .email("Invalid email address")
    .transform((val) => sanitizeInput(val.toLowerCase()))
    .refine((val) => validateSqlInput(val), {
      message: "Invalid email format",
    });
};

export const createSanitizedUrl = () => {
  return z
    .string()
    .url("Invalid URL format")
    .transform((val) => {
      // Remove javascript: and other dangerous protocols
      if (val.match(/^(javascript|data|vbscript):/i)) {
        return "";
      }
      return sanitizeInput(val);
    })
    .refine((val) => val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    });
};

// Phone number validation with sanitization
export const createSanitizedPhone = () => {
  return z
    .string()
    .transform((val) => val.replace(/[^\d+\-\s()]/g, "")) // Keep only digits, +, -, spaces, parentheses
    .refine((val) => /^[\d+\-\s()]{10,15}$/.test(val), {
      message: "Invalid phone number format",
    });
};

// Password validation with strength requirements
export const createSecurePassword = () => {
  return z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be no more than 128 characters")
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "Password must contain at least one lowercase letter",
    })
    .refine((val) => /\d/.test(val), {
      message: "Password must contain at least one number",
    })
    .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
      message: "Password must contain at least one special character",
    });
};
