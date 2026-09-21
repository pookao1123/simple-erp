-- Phase 9: Audit Log table
-- Tracks all mutations on customers, products, invoices, line_items

CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'send', 'mark_paid')),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users see own entries + admin bypass
DROP POLICY IF EXISTS "Users see own audit entries" ON audit_log;
CREATE POLICY "Users see own audit entries" ON audit_log
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));
