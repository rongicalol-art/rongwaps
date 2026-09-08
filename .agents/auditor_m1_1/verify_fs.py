import os
import glob
import re

# Set root dir to repo root
REPO_ROOT = '/Users/ronianb.gica/Projects/rongwaps'
os.chdir(REPO_ROOT)

print("=== 1. Surviving Markdown Inventory ===")
docs_files = sorted([f for f in os.listdir('docs') if f.endswith('.md')])
root_files = sorted([f for f in os.listdir('.') if f.endswith('.md') and f != 'README.md'])
print(f"Surviving in docs/ ({len(docs_files)}): {docs_files}")
print(f"Surviving in root ({len(root_files)}): {root_files}")
total_md = len(docs_files) + len(root_files)
print(f"Total markdown files (excl README): {total_md}")
assert total_md <= 12, f"Total markdown files {total_md} > 12!"

print("\n=== 2. docs/INDEX.md Completeness & Validity ===")
with open('docs/INDEX.md') as f:
    index_content = f.read()

refs = re.findall(r'`([^`]+\.md)`', index_content)
print(f"Found {len(refs)} markdown references in docs/INDEX.md: {refs}")

broken = []
for r in refs:
    target = os.path.normpath(os.path.join('docs', r))
    if not os.path.exists(target):
        broken.append((r, target))

print(f"Broken links: {broken}")
assert len(broken) == 0, f"Found broken links in docs/INDEX.md: {broken}"

missing_from_index = [f for f in docs_files if f != 'INDEX.md' and f not in index_content]
print(f"Surviving docs missing from INDEX.md: {missing_from_index}")
assert len(missing_from_index) == 0, f"Docs missing from index: {missing_from_index}"

print("\n=== 3. Verification of Deleted Files ===")
claimed_deleted = [
    'AGENTS.md.original.md',
    'WIDGETS.md.original.md',
    'ARCHITECT_LOG.md',
    'WORK_CONTEXT.md',
    'TASK_TEMPLATE.md',
    'docs/team.md',
    'docs/PROGRESS_AND_PLANS.md',
    'docs/ROADMAP.md',
    'docs/WIDGET_ARCHITECTURE_REFACTOR_PLAN.md',
    'docs/GRAMMAR_CONVERSATION_QUEST.md',
    'docs/GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md',
    'docs/GRAMMAR_SCREEN_REVIEW_PLAN.md',
    'docs/LESSON_9_GRAMMAR_PLAN.md',
    'docs/CHANGELOG.md',
    'docs/AUDIT_2026-08-16.md',
    'docs/AUDIT_2026-08-24.md',
    'docs/AUDIT_2026-08-26_dictionary_breakdown_consistency.md',
    'docs/UI_CONSISTENCY_AUDIT.md',
    'docs/CHARACTER_BREAKDOWN_HANDOFF.md',
    'docs/COURSE_EXAMPLE_COVERAGE.md',
    'docs/GRAMMAR_EXPERIENCE_PILOTS.md',
    'docs/GRAMMAR_PART_TWO_PLAN.md',
    'docs/MEMORY_HOOK_BOOK1_PILOT.md',
    'docs/MEMORY_HOOK_BOOK1_PILOT_RESULTS.md',
    'docs/MEMORY_HOOK_LABEL_SCENE_SHARED_REPORT.md',
    'docs/MEMORY_HOOK_METADATA_ENRICHMENT.md',
    'docs/MEMORY_HOOK_QUALITY_PROPOSAL.md',
    'docs/RONGWAPS_CHARACTER_BIBLE.md',
    'docs/SEARCH_SPEC.md'
]
still_present = [f for f in claimed_deleted if os.path.exists(f)]
print(f"Claimed deleted files still present: {still_present}")
assert len(still_present) == 0, f"Deleted files still present on disk: {still_present}"

print("\n=== 4. Checking .original.md files across repository ===")
orig_matches = glob.glob('**/*.original.md', recursive=True)
print(f"Matches for *.original.md: {orig_matches}")
assert len(orig_matches) == 0, f"Found .original.md files: {orig_matches}"

print("\n=== 5. Checking AI tool directories (.hermes, .openai) ===")
print(f".hermes exists: {os.path.exists('.hermes')}")
print(f".openai exists: {os.path.exists('.openai')}")
assert not os.path.exists('.hermes'), ".hermes still exists!"
assert not os.path.exists('.openai'), ".openai still exists!"

print("\n=== 6. Preserved JSON assets in docs/ ===")
audio_index = os.path.join('docs', 'audio_index_book1.json')
audio_manifest = os.path.join('docs', 'audio_manifest_book1.json')
print(f"audio_index_book1.json exists: {os.path.exists(audio_index)} ({os.path.getsize(audio_index) if os.path.exists(audio_index) else 0} bytes)")
print(f"audio_manifest_book1.json exists: {os.path.exists(audio_manifest)} ({os.path.getsize(audio_manifest) if os.path.exists(audio_manifest) else 0} bytes)")
assert os.path.exists(audio_index) and os.path.getsize(audio_index) > 0, "audio_index_book1.json missing or empty"
assert os.path.exists(audio_manifest) and os.path.getsize(audio_manifest) > 0, "audio_manifest_book1.json missing or empty"

print("\nALL FORENSIC DISK CHECKS PASSED EMPIRICALLY!")
