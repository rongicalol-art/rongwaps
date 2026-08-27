-- Phase 3: private character-decomposition staging and provenance schema.
--
-- This migration deliberately does not modify character_breakdowns_v2 or any
-- learner-runtime table. All objects are internal-only (RLS enabled with no
-- anon/authenticated policies) and production publication is license-gated.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.decomposition_sources (
  id text NOT NULL,
  version text NOT NULL,
  name text NOT NULL,
  source_url text,
  license text,
  license_url text,
  attribution text,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  retrieved_at timestamptz,
  locale_scope text[] NOT NULL DEFAULT '{}',
  redistribution_status text NOT NULL
    CHECK (redistribution_status IN ('cleared', 'review', 'blocked')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (id, version),
  UNIQUE (id, version, checksum)
);

CREATE TABLE public.decomposition_import_batches (
  id uuid PRIMARY KEY,
  importer_version text NOT NULL,
  parser_version text NOT NULL,
  policy_version text NOT NULL,
  input_manifest_checksum text NOT NULL CHECK (input_manifest_checksum ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'imported', 'validated', 'failed')),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) = 'object'),
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  notes text,
  UNIQUE (importer_version, parser_version, policy_version, input_manifest_checksum)
);

CREATE TABLE public.decomposition_source_license_reviews (
  id uuid PRIMARY KEY,
  source_id text NOT NULL,
  source_version text NOT NULL,
  redistribution_status text NOT NULL
    CHECK (redistribution_status IN ('cleared', 'review', 'blocked')),
  conclusion text NOT NULL CHECK (length(trim(conclusion)) >= 12),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  reviewed_by text NOT NULL CHECK (reviewed_by <> ''),
  reviewed_at timestamptz NOT NULL,
  supersedes_review_id uuid REFERENCES public.decomposition_source_license_reviews(id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.decomposition_sources(id, version),
  UNIQUE (source_id, source_version, reviewed_at)
);

CREATE TABLE public.decomposition_source_records (
  id uuid PRIMARY KEY,
  source_id text NOT NULL,
  source_version text NOT NULL,
  source_record_id text NOT NULL,
  character text NOT NULL CHECK (character <> ''),
  region_qualifiers text[] NOT NULL DEFAULT '{}',
  locale text NOT NULL CHECK (locale <> ''),
  parsing_dialect text,
  adapter_id text NOT NULL,
  raw_record jsonb NOT NULL,
  raw_ids_expression text,
  normalized_tree jsonb,
  parse_status text NOT NULL
    CHECK (parse_status IN ('parsed', 'atomic', 'missing', 'failed', 'metadata-only')),
  diagnostics jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(diagnostics) = 'array'),
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  import_batch_id uuid NOT NULL REFERENCES public.decomposition_import_batches(id),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.decomposition_sources(id, version),
  UNIQUE (source_id, source_version, source_record_id),
  CHECK ((parse_status IN ('parsed', 'atomic')) = (normalized_tree IS NOT NULL))
);

CREATE INDEX decomposition_source_records_character_locale_idx
  ON public.decomposition_source_records (character, locale);
CREATE INDEX decomposition_source_records_source_character_idx
  ON public.decomposition_source_records (source_id, source_version, character);
CREATE INDEX decomposition_source_records_failed_idx
  ON public.decomposition_source_records (source_id, source_version)
  WHERE parse_status = 'failed';
CREATE INDEX decomposition_source_records_regions_gin_idx
  ON public.decomposition_source_records USING gin (region_qualifiers);

CREATE TABLE public.decomposition_source_preferences (
  id uuid PRIMARY KEY,
  import_batch_id uuid NOT NULL REFERENCES public.decomposition_import_batches(id),
  source_id text NOT NULL,
  source_version text NOT NULL,
  character text NOT NULL,
  locale text NOT NULL,
  policy_version text NOT NULL,
  selected_source_record_id uuid REFERENCES public.decomposition_source_records(id),
  selection_status text NOT NULL CHECK (selection_status IN ('selected', 'unsupported-region', 'parse-failure')),
  selection_reason text NOT NULL,
  UNIQUE (import_batch_id, source_id, source_version, character, locale, policy_version),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.decomposition_sources(id, version)
);

CREATE INDEX decomposition_source_preferences_selected_idx
  ON public.decomposition_source_preferences (selected_source_record_id)
  WHERE selected_source_record_id IS NOT NULL;

CREATE TABLE public.decomposition_course_characters (
  import_batch_id uuid NOT NULL REFERENCES public.decomposition_import_batches(id),
  course_variant text NOT NULL CHECK (course_variant IN ('traditional', 'simplified')),
  character text NOT NULL,
  PRIMARY KEY (import_batch_id, course_variant, character)
);

CREATE TABLE public.decomposition_node_references (
  id uuid PRIMARY KEY,
  import_batch_id uuid NOT NULL REFERENCES public.decomposition_import_batches(id),
  source_record_id uuid NOT NULL REFERENCES public.decomposition_source_records(id),
  node_id text NOT NULL,
  node_path integer[] NOT NULL,
  node_kind text NOT NULL
    CHECK (node_kind IN ('glyph', 'structure', 'unencoded-component', 'unknown-component', 'source-entity')),
  glyph text,
  component_source_id text,
  source_entity text,
  ids_operator text,
  UNIQUE (source_record_id, node_id),
  UNIQUE (source_record_id, node_path)
);

CREATE INDEX decomposition_node_references_glyph_idx
  ON public.decomposition_node_references (glyph) WHERE glyph IS NOT NULL;
CREATE INDEX decomposition_node_references_record_path_idx
  ON public.decomposition_node_references (source_record_id, node_path);

CREATE TABLE public.decomposition_component_metadata (
  id uuid PRIMARY KEY,
  glyph text NOT NULL CHECK (glyph <> ''),
  locale text NOT NULL CHECK (locale <> ''),
  field_name text NOT NULL CHECK (field_name <> ''),
  ordinal integer NOT NULL DEFAULT 0 CHECK (ordinal >= 0),
  value jsonb NOT NULL,
  qualifiers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(qualifiers) = 'object'),
  source_record_id uuid NOT NULL REFERENCES public.decomposition_source_records(id),
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (glyph, locale, field_name, ordinal, source_record_id)
);

CREATE INDEX decomposition_component_metadata_lookup_idx
  ON public.decomposition_component_metadata (glyph, locale, field_name);

CREATE TABLE public.decomposition_diagnostics (
  id uuid PRIMARY KEY,
  import_batch_id uuid REFERENCES public.decomposition_import_batches(id),
  source_record_id uuid REFERENCES public.decomposition_source_records(id),
  character text,
  locale text,
  category text NOT NULL CHECK (category IN (
    'malformed-expression', 'invalid-operand', 'unknown-component',
    'unencoded-component', 'missing-reference', 'source-conflict',
    'unsupported-region', 'cycle', 'manual-override', 'missing-decomposition',
    'source-entity', 'licensing-blocker', 'other'
  )),
  code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  message text NOT NULL,
  node_id text,
  token_index integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (import_batch_id, checksum)
);

CREATE INDEX decomposition_diagnostics_category_idx
  ON public.decomposition_diagnostics (category, severity);
CREATE INDEX decomposition_diagnostics_character_idx
  ON public.decomposition_diagnostics (character, locale);

CREATE TABLE public.decomposition_releases (
  id uuid PRIMARY KEY,
  release_key text NOT NULL UNIQUE,
  locale text NOT NULL,
  policy_version text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validated', 'blocked', 'approved', 'published')),
  description text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  approved_at timestamptz,
  published_at timestamptz
);

CREATE TABLE public.decomposition_release_sources (
  release_id uuid NOT NULL REFERENCES public.decomposition_releases(id),
  source_id text NOT NULL,
  source_version text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('structure', 'metadata', 'fallback', 'validation')),
  PRIMARY KEY (release_id, source_id, source_version, purpose),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.decomposition_sources(id, version)
);

CREATE TABLE public.decomposition_release_blockers (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES public.decomposition_releases(id),
  blocker_type text NOT NULL CHECK (blocker_type IN ('licensing', 'quality', 'coverage', 'provenance', 'manual-review')),
  source_id text,
  source_version text,
  code text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'waived')),
  resolution text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (release_id, code),
  FOREIGN KEY (source_id, source_version)
    REFERENCES public.decomposition_sources(id, version)
);

CREATE TABLE public.decomposition_manual_overrides (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES public.decomposition_releases(id),
  character text NOT NULL CHECK (character <> ''),
  locale text NOT NULL CHECK (locale <> ''),
  replacement_source_record_id uuid NOT NULL REFERENCES public.decomposition_source_records(id),
  justification text NOT NULL CHECK (length(trim(justification)) >= 12),
  citation text NOT NULL CHECK (length(trim(citation)) >= 5),
  authored_by text NOT NULL CHECK (authored_by <> ''),
  authored_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  UNIQUE (release_id, character, locale, checksum),
  CHECK (
    (review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (review_status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE public.decomposition_selection_decisions (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES public.decomposition_releases(id),
  character text NOT NULL CHECK (character <> ''),
  locale text NOT NULL CHECK (locale <> ''),
  selected_source_record_id uuid REFERENCES public.decomposition_source_records(id),
  manual_override_id uuid REFERENCES public.decomposition_manual_overrides(id),
  selection_status text NOT NULL CHECK (selection_status IN (
    'selected', 'atomic-leaf', 'unresolved', 'missing-decomposition', 'manual-review'
  )),
  selection_reason text NOT NULL,
  quality_score numeric(5,4) CHECK (quality_score BETWEEN 0 AND 1),
  quality_status text NOT NULL
    CHECK (quality_status IN ('source-preferred', 'fallback', 'atomic', 'unresolved', 'review-required')),
  reviewed boolean NOT NULL DEFAULT false,
  selected_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (release_id, character, locale),
  CHECK (
    (selection_status IN ('selected', 'atomic-leaf') AND selected_source_record_id IS NOT NULL)
    OR (selection_status NOT IN ('selected', 'atomic-leaf') AND selected_source_record_id IS NULL)
  )
);

CREATE OR REPLACE FUNCTION public.validate_decomposition_manual_override()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  replacement_character text;
  replacement_locale text;
BEGIN
  SELECT character, locale
    INTO replacement_character, replacement_locale
  FROM public.decomposition_source_records
  WHERE id = NEW.replacement_source_record_id;

  IF replacement_character IS DISTINCT FROM NEW.character THEN
    RAISE EXCEPTION 'override replacement character % does not match %', replacement_character, NEW.character;
  END IF;
  IF replacement_locale IS DISTINCT FROM NEW.locale
     AND replacement_locale NOT IN ('und', 'fallback', 'zh-Hant-TW', 'zh-Hans') THEN
    RAISE EXCEPTION 'override replacement locale % is not compatible with %', replacement_locale, NEW.locale;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decomposition_manual_override_source_guard
  BEFORE INSERT OR UPDATE ON public.decomposition_manual_overrides
  FOR EACH ROW EXECUTE FUNCTION public.validate_decomposition_manual_override();

CREATE OR REPLACE FUNCTION public.validate_decomposition_selection_override()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  override_record_id uuid;
  override_status text;
BEGIN
  IF NEW.manual_override_id IS NULL THEN RETURN NEW; END IF;
  SELECT replacement_source_record_id, review_status
    INTO override_record_id, override_status
  FROM public.decomposition_manual_overrides
  WHERE id = NEW.manual_override_id
    AND release_id = NEW.release_id
    AND character = NEW.character
    AND locale = NEW.locale;
  IF override_status IS DISTINCT FROM 'approved' OR override_record_id IS DISTINCT FROM NEW.selected_source_record_id THEN
    RAISE EXCEPTION 'selection requires a matching approved manual override';
  END IF;
  NEW.reviewed := true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decomposition_selection_override_guard
  BEFORE INSERT OR UPDATE ON public.decomposition_selection_decisions
  FOR EACH ROW EXECUTE FUNCTION public.validate_decomposition_selection_override();

CREATE TABLE public.character_decompositions (
  character text NOT NULL,
  locale text NOT NULL,
  release_id uuid NOT NULL REFERENCES public.decomposition_releases(id),
  selected_source_record_id uuid NOT NULL REFERENCES public.decomposition_source_records(id),
  normalized_tree jsonb,
  selection_reason text NOT NULL,
  quality_score numeric(5,4) CHECK (quality_score BETWEEN 0 AND 1),
  quality_status text NOT NULL
    CHECK (quality_status IN ('source-preferred', 'fallback', 'atomic', 'unresolved', 'review-required')),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (character, locale, release_id)
);

CREATE INDEX character_decompositions_locale_character_idx
  ON public.character_decompositions (locale, character);

CREATE TABLE public.decomposition_conflicts (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES public.decomposition_releases(id),
  character text NOT NULL,
  locale text NOT NULL,
  conflict_kind text NOT NULL,
  selected_source_record_id uuid REFERENCES public.decomposition_source_records(id),
  resolution_reason text,
  resolution_method text NOT NULL DEFAULT 'automatic'
    CHECK (resolution_method IN ('automatic', 'manual-reviewed', 'unresolved')),
  reviewed_by text,
  reviewed_at timestamptz,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (release_id, character, locale, conflict_kind, checksum)
);

CREATE TABLE public.decomposition_conflict_assertions (
  conflict_id uuid NOT NULL REFERENCES public.decomposition_conflicts(id),
  source_record_id uuid NOT NULL REFERENCES public.decomposition_source_records(id),
  assertion jsonb NOT NULL,
  PRIMARY KEY (conflict_id, source_record_id)
);

ALTER TABLE public.decomposition_diagnostics
  ADD COLUMN manual_override_id uuid REFERENCES public.decomposition_manual_overrides(id),
  ADD CONSTRAINT decomposition_diagnostics_origin_check
    CHECK (import_batch_id IS NOT NULL OR manual_override_id IS NOT NULL),
  ADD CONSTRAINT decomposition_diagnostics_override_event_unique
    UNIQUE (manual_override_id, code, checksum);

CREATE OR REPLACE FUNCTION public.audit_decomposition_manual_override()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  diagnostic_checksum text;
BEGIN
  diagnostic_checksum := encode(extensions.digest(
    concat_ws('|', NEW.id::text, NEW.checksum, NEW.review_status),
    'sha256'
  ), 'hex');
  INSERT INTO public.decomposition_diagnostics (
    id, manual_override_id, character, locale, category, code, severity,
    message, details, checksum
  ) VALUES (
    gen_random_uuid(), NEW.id, NEW.character, NEW.locale, 'manual-override',
    'manual-override-' || NEW.review_status,
    CASE WHEN NEW.review_status = 'approved' THEN 'info' ELSE 'warning' END,
    'Manual override audit event: ' || NEW.review_status,
    jsonb_build_object(
      'replacementSourceRecordId', NEW.replacement_source_record_id,
      'authoredBy', NEW.authored_by,
      'reviewedBy', NEW.reviewed_by
    ),
    diagnostic_checksum
  ) ON CONFLICT (manual_override_id, code, checksum) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decomposition_manual_override_audit
  AFTER INSERT OR UPDATE OF review_status ON public.decomposition_manual_overrides
  FOR EACH ROW EXECUTE FUNCTION public.audit_decomposition_manual_override();

-- Canonical source rows and records are append-only. Changed content must use
-- a new source version instead of mutating provenance in place.
CREATE OR REPLACE FUNCTION public.reject_decomposition_immutable_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION '% is immutable; import a new version instead', TG_TABLE_NAME;
  RETURN NULL;
END;
$$;

CREATE TRIGGER decomposition_sources_immutable
  BEFORE UPDATE OR DELETE ON public.decomposition_sources
  FOR EACH ROW EXECUTE FUNCTION public.reject_decomposition_immutable_change();
CREATE TRIGGER decomposition_source_license_reviews_immutable
  BEFORE UPDATE OR DELETE ON public.decomposition_source_license_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reject_decomposition_immutable_change();
CREATE TRIGGER decomposition_source_records_immutable
  BEFORE UPDATE OR DELETE ON public.decomposition_source_records
  FOR EACH ROW EXECUTE FUNCTION public.reject_decomposition_immutable_change();
CREATE TRIGGER decomposition_source_preferences_immutable
  BEFORE UPDATE OR DELETE ON public.decomposition_source_preferences
  FOR EACH ROW EXECUTE FUNCTION public.reject_decomposition_immutable_change();
CREATE TRIGGER decomposition_course_characters_immutable
  BEFORE UPDATE OR DELETE ON public.decomposition_course_characters
  FOR EACH ROW EXECUTE FUNCTION public.reject_decomposition_immutable_change();
CREATE TRIGGER decomposition_component_metadata_immutable
  BEFORE UPDATE OR DELETE ON public.decomposition_component_metadata
  FOR EACH ROW EXECUTE FUNCTION public.reject_decomposition_immutable_change();

-- Selected output is a projection, never an arbitrary edit surface.
CREATE OR REPLACE FUNCTION public.guard_character_decomposition_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.decomposition_projection_write', true) <> 'allowed' THEN
    RAISE EXCEPTION 'character_decompositions is projection-only';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER character_decompositions_projection_only
  BEFORE INSERT OR UPDATE OR DELETE ON public.character_decompositions
  FOR EACH ROW EXECUTE FUNCTION public.guard_character_decomposition_write();

CREATE OR REPLACE FUNCTION public.refresh_character_decomposition_projection(p_release_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  projected_count integer;
BEGIN
  PERFORM set_config('app.decomposition_projection_write', 'allowed', true);

  DELETE FROM public.character_decompositions WHERE release_id = p_release_id;
  INSERT INTO public.character_decompositions (
    character, locale, release_id, selected_source_record_id,
    normalized_tree, selection_reason, quality_score, quality_status
  )
  SELECT
    decision.character,
    decision.locale,
    decision.release_id,
    decision.selected_source_record_id,
    record.normalized_tree,
    decision.selection_reason,
    decision.quality_score,
    decision.quality_status
  FROM public.decomposition_selection_decisions AS decision
  JOIN public.decomposition_source_records AS record
    ON record.id = decision.selected_source_record_id
  WHERE decision.release_id = p_release_id
    AND decision.selection_status IN ('selected', 'atomic-leaf');

  GET DIAGNOSTICS projected_count = ROW_COUNT;
  RETURN projected_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_character_decomposition_projection(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_character_decomposition_projection(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_character_decomposition_projection(uuid) TO service_role;

-- Large deterministic imports are queried immediately, before autovacuum has
-- necessarily collected cardinality statistics. Refresh the staging-table
-- statistics explicitly so the first metrics read cannot inherit pathological
-- empty-table plans from the start of the import.
CREATE OR REPLACE FUNCTION public.analyze_decomposition_staging()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ANALYZE public.decomposition_source_records;
  ANALYZE public.decomposition_source_preferences;
  ANALYZE public.decomposition_course_characters;
  ANALYZE public.decomposition_node_references;
  ANALYZE public.decomposition_component_metadata;
  ANALYZE public.decomposition_diagnostics;
  ANALYZE public.decomposition_release_blockers;
  ANALYZE public.decomposition_selection_decisions;
  ANALYZE public.decomposition_conflicts;
END;
$$;

REVOKE ALL ON FUNCTION public.analyze_decomposition_staging() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_decomposition_staging() TO service_role;

CREATE OR REPLACE FUNCTION public.get_decomposition_staging_metrics(
  p_import_batch_id uuid,
  p_release_id uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sourceRecords', (
      SELECT count(*) FROM public.decomposition_source_records
      WHERE import_batch_id = p_import_batch_id
    ),
    'parsedRecords', (
      SELECT count(*) FROM public.decomposition_source_records
      WHERE import_batch_id = p_import_batch_id AND parse_status IN ('parsed', 'atomic')
    ),
    'failedRecords', (
      SELECT count(*) FROM public.decomposition_source_records
      WHERE import_batch_id = p_import_batch_id AND parse_status = 'failed'
    ),
    'metadataOnlyRecords', (
      SELECT count(*) FROM public.decomposition_source_records
      WHERE import_batch_id = p_import_batch_id AND parse_status = 'metadata-only'
    ),
    'unencodedComponentOccurrences', (
      SELECT count(*) FROM public.decomposition_node_references
      WHERE import_batch_id = p_import_batch_id AND node_kind = 'unencoded-component'
    ),
    'selectedCjkviUnencodedComponentOccurrences', (
      SELECT count(*)
      FROM public.decomposition_source_preferences AS preference
      JOIN public.decomposition_node_references AS node
        ON node.source_record_id = preference.selected_source_record_id
      WHERE preference.import_batch_id = p_import_batch_id
        AND preference.source_id = 'cjkvi-ids'
        AND node.node_kind = 'unencoded-component'
    ),
    'makeMeAHanziUnknownComponentOccurrences', (
      SELECT count(*)
      FROM public.decomposition_node_references AS node
      JOIN public.decomposition_source_records AS record ON record.id = node.source_record_id
      WHERE node.import_batch_id = p_import_batch_id
        AND record.source_id = 'makemeahanzi-dictionary'
        AND node.node_kind = 'unknown-component'
    ),
    'regionalVariantCharacters', (
      SELECT count(DISTINCT character)
      FROM public.decomposition_source_records
      WHERE import_batch_id = p_import_batch_id
        AND source_id = 'cjkvi-ids'
        AND cardinality(region_qualifiers) > 0
    ),
    'taiwanSpecificVariantCharacters', (
      SELECT count(DISTINCT character)
      FROM public.decomposition_source_records
      WHERE import_batch_id = p_import_batch_id
        AND source_id = 'cjkvi-ids'
        AND 'T' = ANY(region_qualifiers)
    ),
    'selectedCjkviMissingReferencedGlyphs', (
      SELECT count(DISTINCT node.glyph)
      FROM public.decomposition_source_preferences AS parent_preference
      JOIN public.decomposition_node_references AS node
        ON node.source_record_id = parent_preference.selected_source_record_id
      LEFT JOIN public.decomposition_source_preferences AS target_preference
        ON target_preference.import_batch_id = parent_preference.import_batch_id
       AND target_preference.source_id = parent_preference.source_id
       AND target_preference.source_version = parent_preference.source_version
       AND target_preference.locale = parent_preference.locale
       AND target_preference.character = node.glyph
       AND target_preference.selected_source_record_id IS NOT NULL
      WHERE parent_preference.import_batch_id = p_import_batch_id
        AND parent_preference.source_id = 'cjkvi-ids'
        AND node.node_kind = 'glyph'
        AND node.glyph <> parent_preference.character
        AND target_preference.id IS NULL
    ),
    'directChildConflicts', (
      SELECT count(*) FROM public.decomposition_conflicts WHERE release_id = p_release_id
    ),
    'traditionalCourse', jsonb_build_object(
      'total', (
        SELECT count(*) FROM public.decomposition_course_characters
        WHERE import_batch_id = p_import_batch_id AND course_variant = 'traditional'
      ),
      'unresolved', (
        SELECT count(*)
        FROM public.decomposition_course_characters AS course
        LEFT JOIN public.decomposition_selection_decisions AS decision
          ON decision.release_id = p_release_id
         AND decision.character = course.character
         AND decision.selection_status IN ('selected', 'atomic-leaf')
        WHERE course.import_batch_id = p_import_batch_id
          AND course.course_variant = 'traditional'
          AND decision.id IS NULL
      )
    ),
    'simplifiedCourse', jsonb_build_object(
      'total', (
        SELECT count(*) FROM public.decomposition_course_characters
        WHERE import_batch_id = p_import_batch_id AND course_variant = 'simplified'
      ),
      'unresolved', (
        SELECT count(*)
        FROM public.decomposition_course_characters AS course
        LEFT JOIN public.decomposition_selection_decisions AS decision
          ON decision.release_id = p_release_id
         AND decision.character = course.character
         AND decision.selection_status IN ('selected', 'atomic-leaf')
        WHERE course.import_batch_id = p_import_batch_id
          AND course.course_variant = 'simplified'
          AND decision.id IS NULL
      )
    ),
    'specialTraditionalCharacters', (
      SELECT jsonb_object_agg(fixture.character,
        CASE WHEN decision.id IS NULL THEN 'unresolved' ELSE 'selected' END)
      FROM (VALUES ('嚐'), ('溼'), ('汙')) AS fixture(character)
      LEFT JOIN public.decomposition_selection_decisions AS decision
        ON decision.release_id = p_release_id
       AND decision.character = fixture.character
       AND decision.selection_status IN ('selected', 'atomic-leaf')
    ),
    'releaseStatus', (
      SELECT status FROM public.decomposition_releases WHERE id = p_release_id
    ),
    'openLicensingBlockers', (
      SELECT count(*) FROM public.decomposition_release_blockers
      WHERE release_id = p_release_id AND blocker_type = 'licensing' AND status = 'open'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_decomposition_staging_metrics(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_decomposition_staging_metrics(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_decomposition_release_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  blocking_count integer;
BEGIN
  IF NEW.status IN ('approved', 'published') THEN
    SELECT COUNT(*) INTO blocking_count
    FROM public.decomposition_manual_overrides
    WHERE release_id = NEW.id
      AND review_status <> 'approved';
    IF blocking_count > 0 THEN
      RAISE EXCEPTION 'release % has % unreviewed manual override(s)',
        NEW.release_key, blocking_count;
    END IF;

    SELECT COUNT(*) INTO blocking_count
    FROM public.decomposition_release_blockers
    WHERE release_id = NEW.id AND status = 'open';
    IF blocking_count > 0 THEN
      RAISE EXCEPTION 'release % has % open blocker(s)', NEW.release_key, blocking_count;
    END IF;

    SELECT COUNT(*) INTO blocking_count
    FROM public.decomposition_release_sources AS release_source
    JOIN public.decomposition_sources AS source
      ON source.id = release_source.source_id
     AND source.version = release_source.source_version
    WHERE release_source.release_id = NEW.id
      AND COALESCE((
        SELECT review.redistribution_status
        FROM public.decomposition_source_license_reviews AS review
        WHERE review.source_id = source.id
          AND review.source_version = source.version
        ORDER BY review.reviewed_at DESC
        LIMIT 1
      ), source.redistribution_status) <> 'cleared';
    IF blocking_count > 0 THEN
      RAISE EXCEPTION 'release % contains % source(s) not cleared for redistribution',
        NEW.release_key, blocking_count;
    END IF;
  END IF;

  NEW.updated_at := timezone('utc', now());
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := timezone('utc', now());
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := timezone('utc', now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decomposition_release_status_guard
  BEFORE INSERT OR UPDATE ON public.decomposition_releases
  FOR EACH ROW EXECUTE FUNCTION public.guard_decomposition_release_status();

-- Internal-only: service-role/import tooling may access these tables, while
-- browser roles receive neither table grants nor permissive RLS policies.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'decomposition_sources', 'decomposition_import_batches',
    'decomposition_source_license_reviews',
    'decomposition_source_records', 'decomposition_node_references',
    'decomposition_source_preferences', 'decomposition_course_characters',
    'decomposition_component_metadata', 'decomposition_diagnostics',
    'decomposition_releases', 'decomposition_release_sources',
    'decomposition_release_blockers', 'decomposition_manual_overrides',
    'decomposition_selection_decisions', 'character_decompositions',
    'decomposition_conflicts', 'decomposition_conflict_assertions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.reject_decomposition_immutable_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_character_decomposition_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_decomposition_release_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_decomposition_manual_override() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_decomposition_selection_override() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_decomposition_manual_override() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analyze_decomposition_staging() FROM PUBLIC, anon, authenticated;
