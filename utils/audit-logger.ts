import { getSupabaseServer } from "@/utils/supabase/server";

export interface AuditLogEntry {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

// Helper type for entries that might be missing required fields
type PartialAuditLogEntry = Partial<AuditLogEntry>;

// Helper type for ensuring required fields are present
type RequiredAuditFields = "action" | "resource_type";

/**
 * Inserts an audit log entry into the "admin_logs" table in the Supabase backend.
 *
 * Adds a timestamp to the entry and logs any errors encountered during the insertion process.
 */
export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    const supabase = await getSupabaseServer();

    const { error } = await supabase.from("admin_logs").insert({
      ...entry,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  } catch (error) {
    console.error("Audit logging error:", error);
  }
}

export function createAuditLogger(baseContext: PartialAuditLogEntry) {
  return {
    log: (
      entry: PartialAuditLogEntry &
        Required<Pick<AuditLogEntry, RequiredAuditFields>>,
    ) => {
      // Ensure required fields are present
      const completeEntry: AuditLogEntry = {
        ...baseContext,
        ...entry,
      };
      return logAuditEvent(completeEntry);
    },
  };
}
