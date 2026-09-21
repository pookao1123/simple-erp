import { getAdminClient } from './supabase-admin';

/**
 * Log an audit entry for a mutation.
 * Silent failure — audit issues shouldn't break the main operation.
 */
export async function logAudit(
  userId: string,
  action: string,
  table: string,
  recordId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await getAdminClient().from('audit_log').insert({
    user_id: userId,
    action,
    table_name: table,
    record_id: recordId,
    old_values: oldValues ?? null,
    new_values: newValues ?? null,
    metadata: metadata ?? {},
  });
  if (error) {
    console.error('Audit log insert failed:', error);
  }
}
