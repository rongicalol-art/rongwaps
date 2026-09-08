import os
import re

docs_to_check = [
    'AGENTS.md',
    'DECISIONS.md',
    'README.md',
    'TEST_INFRA.md',
    'TEST_READY.md',
    'WIDGETS.md',
    'docs/API_SPEC.md',
    'docs/ARCHITECTURE.md',
    'docs/COURSE_EXAMPLES.md',
    'docs/DATABASE_SCHEMA.md',
    'docs/DESIGN_TOKENS.md',
    'docs/GRAMMAR_LESSON_TEMPLATE.md',
    'docs/INDEX.md',
    'docs/OFFICIAL_AUDIO_SOURCES.md'
]

broken = []
valid = []

for doc_path in docs_to_check:
    if not os.path.exists(doc_path):
        continue
    dir_name = os.path.dirname(doc_path) or '.'
    with open(doc_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find any token ending in .md
    matches = set(re.findall(r'[\s`\(\[\'\"]([a-zA-Z0-9_\-\./]+\.md)', content))
    for m in matches:
        if m.startswith('http'):
            continue
        # candidates
        resolved = os.path.normpath(os.path.join(dir_name, m))
        root_resolved = os.path.normpath(m)
        docs_resolved = os.path.normpath(os.path.join('docs', m))

        if os.path.exists(resolved) and os.path.isfile(resolved):
            valid.append((doc_path, m, resolved))
        elif os.path.exists(root_resolved) and os.path.isfile(root_resolved):
            valid.append((doc_path, m, root_resolved))
        elif os.path.exists(docs_resolved) and os.path.isfile(docs_resolved):
            valid.append((doc_path, m, docs_resolved))
        else:
            broken.append((doc_path, m))

print(f'Total valid doc refs: {len(valid)}')
if broken:
    print(f'Broken doc refs ({len(broken)}):')
    for doc, ref in sorted(set(broken)):
        print(f'  In {doc}: refers to non-existent "{ref}"')
else:
    print('ALL .md references in all surviving docs point to existing files!')
