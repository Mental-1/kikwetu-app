import { ActionResponse } from "@/lib/types/form-types";
import { logAuditEvent } from "@/utils/audit-logger";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleActionError(
  error: unknown,
  context: {
    action: string;
    userId?: string;
    resourceId?: string;
    ip?: string;
  },
): ActionResponse {
  console.error(`Error in ${context.action}:`, error);

  // Log error for audit purposes
  logAuditEvent({
    user_id: context.userId,
    action: `${context.action}_error`,
    resource_type: "system",
    resource_id: context.resourceId,
    ip_address: context.ip,
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });

  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    // Database constraint violations
    if (error.message.includes("unique constraint")) {
      return {
        success: false,
        error: "A record with this information already exists",
        message: "Duplicate entry detected",
      };
    }

    // Foreign key violations
    if (error.message.includes("foreign key constraint")) {
      return {
        success: false,
        error: "Referenced data not found",
        message: "Invalid reference",
      };
    }

    // Permission errors
    if (error.message.includes("RLS")) {
      return {
        success: false,
        error: "You do not have permission to perform this action",
        message: "Access denied",
      };
    }
  }

  return {
    success: false,
    error: "An unexpected error occurred. Please try again.",
    message: "Internal server error",
  };
}
