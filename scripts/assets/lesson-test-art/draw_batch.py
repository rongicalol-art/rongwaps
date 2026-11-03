"""Draw lesson-test pictures with Codex, a few at a time: each brief → generate.sh with the right references.

    python3 scripts/assets/lesson-test-art/draw_batch.py <workers> <brief name> [...]   (run from the repo root)

Every picture takes the owner's approved lesson cover as its style reference (style.txt is the cover master prompt,
docs/reference/READING_ART_PROMPTS.md); a brief's Characters: line adds the portraits. Then review each with
REVIEW.md before cutting. A name whose output/lesson-test-art/<name>.png already exists is
skipped unless --again is given (then generate.sh saves a -vN take).
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path.cwd()
ART = ROOT / "scripts/assets/lesson-test-art"
OUT = ROOT / "output/lesson-test-art"
BENCHMARK = "src/assets/images/readings/b1l01-r01-new-classmate-v8.webp"  # The approved lesson cover.


def refs(brief):
    head = {}
    for line in brief.read_text(encoding="utf-8").splitlines()[:5]:
        if ":" in line and line.split(":", 1)[0] in ("Kind", "Style", "Characters"):
            key, value = line.split(":", 1)
            head[key] = value.strip()
    people = [p.strip() for p in head.get("Characters", "none").split(",") if p.strip() and p.strip() != "none"]
    return [BENCHMARK, *people]


def draw(name):
    brief = ART / "briefs" / f"{name}.txt"
    if (OUT / f"{name}.png").exists() and "--again" not in sys.argv:
        return f"skip {name}"
    result = subprocess.run(["zsh", str(ART / "generate.sh"), name, str(brief), *refs(brief)], capture_output=True, text=True)
    return (result.stdout.strip() or result.stderr.strip()).splitlines()[-1] if (result.stdout or result.stderr) else f"? {name}"


workers = int(sys.argv[1])
names = [a for a in sys.argv[2:] if not a.startswith("--")]
with ThreadPoolExecutor(workers) as pool:
    for line in pool.map(draw, names):
        print(line, flush=True)
