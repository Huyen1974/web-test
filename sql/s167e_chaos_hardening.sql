-- S167E: Chaos-test hardening — guards for v_registry_counts + system_issues
-- Already applied via SSH. This file ensures idempotent re-application on future deploys.

-- ═══════════════════════════════════════
-- TD-375: Guard v_registry_counts from direct writes
-- ═══════════════════════════════════════
GRANT TRIGGER ON v_registry_counts TO directus;

CREATE OR REPLACE FUNCTION fn_guard_v_registry_counts()
RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF current_setting('app.allow_meta_update', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Direct modification of v_registry_counts is blocked. Use meta_catalog triggers or DOT tools. (S167E guard)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_v_registry_counts ON v_registry_counts;
CREATE TRIGGER trg_guard_v_registry_counts
  BEFORE INSERT OR UPDATE OR DELETE ON v_registry_counts
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_v_registry_counts();

-- ═══════════════════════════════════════
-- TD-376: Guard system_issues from anonymous inserts
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_guard_system_issues_insert()
RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.source_system IS NOT NULL AND NEW.source_system != '' THEN
    RETURN NEW;
  END IF;
  IF NEW.source IS NOT NULL AND NEW.source != '' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'system_issues INSERT requires source_system or source field. Anonymous inserts blocked. (S167E guard)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_system_issues_insert ON system_issues;
CREATE TRIGGER trg_guard_system_issues_insert
  BEFORE INSERT ON system_issues
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_system_issues_insert();
