-- Fix dictionary pinyin headers corrupted by surname/secondary-reading promotion.
--
-- After applying this migration, refresh the static dictionary artifacts so
-- the corrected pinyin reaches the client:
--   npm run dictionary:trie && npm run dictionary:packs
--
-- Background (audit 2026-08-26): many single-character `dictionary` rows carry
-- a surname or rare reading as `pinyin_accented` (e.g. 单 -> Shàn, 区 -> Ōu,
-- 万 -> mò, 无 -> mó, 那 -> Nā, 都 -> Dū) with the definitions of that
-- secondary reading prepended ("surname X", "used in X", "variant of X",
-- "see X"). The learner-primary reading lives in `character_breakdowns_v2`
-- (the source the breakdown screen renders).
--
-- Rule: for single-character rows whose first definition shows the
-- corruption signature, replace the header pinyin with the breakdown
-- record's reading when they genuinely differ. Capitalization-only
-- differences are untouched. A small blocklist keeps characters where the
-- breakdown reading is itself questionable (卜, 罗/羅, 沈, 覃, 缪/繆, 着).
--
-- Preview before applying:
--   SELECT d.id, d.traditional, d.simplified, d.pinyin_accented AS old_pinyin,
--          b.pinyin[1] AS new_pinyin, d.definitions->>0 AS first_definition
--   FROM dictionary d
--   JOIN character_breakdowns_v2 b
--     ON b.character = d.simplified
--     OR (b.character = d.traditional
--         AND NOT EXISTS (SELECT 1 FROM character_breakdowns_v2 s WHERE s.character = d.simplified))
--   WHERE length(d.traditional) = 1
--     AND b.pinyin IS NOT NULL
--     AND lower(d.pinyin_accented) <> lower(b.pinyin[1])
--     AND (lower(d.definitions->>0) LIKE 'surname %'
--       OR lower(d.definitions->>0) LIKE 'used in %'
--       OR lower(d.definitions->>0) LIKE 'variant of %'
--       OR lower(d.definitions->>0) LIKE 'see %')
--     AND d.simplified NOT IN ('卜','罗','沈','覃','缪','着')
--     AND d.traditional NOT IN ('羅','繆','着')
--   ORDER BY d.id;

BEGIN;

UPDATE dictionary d
SET pinyin_accented = b.pinyin[1],
    pinyin_flat = translate(
      lower(b.pinyin[1]),
      'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ',
      'aaaaeeeeiiiioooouuuuvvvv'
    )
FROM character_breakdowns_v2 b
WHERE (
    b.character = d.simplified
    OR (b.character = d.traditional
        AND NOT EXISTS (SELECT 1 FROM character_breakdowns_v2 s WHERE s.character = d.simplified))
  )
  AND length(d.traditional) = 1
  AND b.pinyin IS NOT NULL
  AND lower(d.pinyin_accented) <> lower(b.pinyin[1])
  AND (lower(d.definitions->>0) LIKE 'surname %'
    OR lower(d.definitions->>0) LIKE 'used in %'
    OR lower(d.definitions->>0) LIKE 'variant of %'
    OR lower(d.definitions->>0) LIKE 'see %')
  AND d.simplified NOT IN ('卜','罗','沈','覃','缪','着')
  AND d.traditional NOT IN ('羅','繆','着');

-- Verification: any rows left with the corruption signature but a mismatching
-- breakdown reading are candidates for the curated follow-up pass.
SELECT d.id, d.traditional, d.simplified, d.pinyin_accented, b.pinyin[1] AS breakdown_pinyin
FROM dictionary d
JOIN character_breakdowns_v2 b
  ON b.character = d.simplified
  OR (b.character = d.traditional
      AND NOT EXISTS (SELECT 1 FROM character_breakdowns_v2 s WHERE s.character = d.simplified))
WHERE length(d.traditional) = 1
  AND b.pinyin IS NOT NULL
  AND lower(d.pinyin_accented) <> lower(b.pinyin[1])
ORDER BY d.id;

COMMIT;
