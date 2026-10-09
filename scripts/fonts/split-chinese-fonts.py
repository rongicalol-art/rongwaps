#!/usr/bin/env python3
"""Split the big Chinese webfonts into unicode-range woff2 slices (Google-Fonts style).

Source fonts: content/fonts/<name>.woff2 (not shipped).
Output:       public/fonts/<name>/<name>.<n>.woff2  +  src/styles/fonts.generated.css

Slice 0 is the "core": every Han char used by the app's learner content, the
TOCFL level lists and basic punctuation. Core is chunked to ~CORE_BUDGET*0.8 per slice
into slices 0..k by usage frequency. Remaining glyphs go by codepoint order
into ~SLICE_BYTES slices. Output is deterministic.

Run: npm run fonts:split
"""
import io, os, re, sys
from collections import Counter
from multiprocessing import Pool
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'content', 'fonts')
OUT = os.path.join(ROOT, 'public', 'fonts')
CSS = os.path.join(ROOT, 'src', 'styles', 'fonts.generated.css')

CORE_BUDGET = 250_000
SLICE_BYTES = 120_000

FONTS = [  # (file, family, weight)
    ('huninn', 'Huninn', '400'),
    ('rounded-sc', 'Rounded-SC', '100 900'),
    ('edukai', 'TW-EduKai', '400'),
    ('lxgw-wenkai', 'LXGW-WenKai', '100 900'),
]

# Learner-facing content (lookup tables such as dictionary/search/strokes are excluded
# on purpose: they list thousands of rare chars that are rarely rendered).
CORE_DIRS = ['public/data/vocabulary', 'public/data/readings', 'public/data/grammar',
             'public/data/course-examples', 'public/data/dialogue-alignment',
             'public/data/levels', 'content/grammar', 'content/readings']
CORE_FILES = ['content/dialogueAlignment.json']

HAN = re.compile(r'[㐀-䶿一-鿿豈-﫿\U00020000-\U0002ffff]')
# punctuation / symbols always in core: general punct, CJK symbols, fullwidth forms
PUNCT = list(range(0x2000, 0x2070)) + list(range(0x3000, 0x3040)) + list(range(0xFF00, 0xFFF0)) + list(range(0x20, 0x7F))


def content_freq():
    cnt = Counter()
    paths = [os.path.join(ROOT, f) for f in CORE_FILES]
    for d in CORE_DIRS:
        for dp, dn, fn in sorted(os.walk(os.path.join(ROOT, d))):
            dn.sort()
            paths += [os.path.join(dp, f) for f in sorted(fn) if f.endswith('.json')]
    for p in paths:
        with open(p, encoding='utf8') as fh:
            cnt.update(ord(c) for c in HAN.findall(fh.read()))
    return cnt


def make_slice(src_bytes, cps):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.hinting = False
    opts.desubroutinize = True
    opts.layout_features = ['*']
    opts.glyph_names = False
    opts.notdef_outline = True
    opts.name_IDs = ['*']
    opts.recalc_timestamp = False
    font = TTFont(io.BytesIO(src_bytes), recalcTimestamp=False)
    s = subset.Subsetter(opts)
    s.populate(unicodes=cps)
    s.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    return buf.getvalue()


def ranges(cps):
    cps = sorted(cps)
    out, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        a, b = cps[i], cps[j]
        out.append(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}')
        i = j + 1
    return ', '.join(out)


def build(job):
    (name, family, weight), freq = job
    css = []
    path = os.path.join(SRC, name + '.woff2')
    src = open(path, 'rb').read()
    cmap = set(TTFont(io.BytesIO(src)).getBestCmap())
    core = {c for c in freq if c in cmap} | {c for c in PUNCT if c in cmap}
    core_sorted = sorted(core, key=lambda c: (-freq.get(c, 1_000_000), c))
    rest = sorted(cmap - core)
    # Per-glyph size estimate (glyf bytes + metrics), scaled to the compressed total.
    tt = TTFont(io.BytesIO(src))
    order = tt.getGlyphOrder()
    gid = {n: i for i, n in enumerate(order)}
    loca = tt['loca']
    cm = tt.getBestCmap()
    gsz = lambda cp: (loca[gid[cm[cp]] + 1] - loca[gid[cm[cp]]]) + 8
    ratio = len(src) / sum(gsz(c) for c in cmap)

    def chunk(cps, target, ratio=ratio):
        out, cur, acc = [], [], 0
        for c in cps:
            w = gsz(c) * ratio
            if cur and acc + w > target:
                out.append(cur)
                cur, acc = [], 0
            cur.append(c)
            acc += w
        if cur:
            out.append(cur)
        return out

    # Core glyphs are simpler/more compressible than the rare tail: calibrate on the real core slice.
    core_ratio = len(make_slice(src, core_sorted)) / sum(gsz(c) for c in core_sorted)
    groups = chunk(core_sorted, CORE_BUDGET * 0.9, core_ratio) + chunk(rest, SLICE_BYTES)
    outdir = os.path.join(OUT, name)
    os.makedirs(outdir, exist_ok=True)
    for f in os.listdir(outdir):
        os.remove(os.path.join(outdir, f))
    sizes = []
    for i, g in enumerate(groups):
        data = make_slice(src, g)
        with open(os.path.join(outdir, f'{name}.{i}.woff2'), 'wb') as fh:
            fh.write(data)
        sizes.append(len(data))
        css.append(
            f"@font-face {{\n  font-family: '{family}';\n  src: url('/fonts/{name}/{name}.{i}.woff2') format('woff2');\n"
            f"  font-weight: {weight};\n  font-style: normal;\n  font-display: swap;\n  unicode-range: {ranges(g)};\n}}\n")
    return (name, len(src), len(cmap), len(core), sizes), ''.join(css)


def main():
    freq = content_freq()
    with Pool(len(FONTS)) as pool:
        results = pool.map(build, [(f, freq) for f in FONTS])
    rows = [r for r, _ in results]
    css = [c for _, c in results]
    with open(CSS, 'w', encoding='utf8') as fh:
        fh.write('/* GENERATED by scripts/fonts/split-chinese-fonts.py — do not edit. */\n' + '\n'.join(css))
    print(f"{'font':<14}{'orig KB':>9}{'glyphs':>8}{'core ch':>8}  slices(KB)")
    for name, o, g, c, sizes in rows:
        print(f'{name:<14}{o/1024:>9.0f}{g:>8}{c:>8}  ' + ' '.join(f'{s/1024:.0f}' for s in sizes[:4]) + (f' … ({len(sizes)} total, {sum(sizes)/1024:.0f} KB)' if len(sizes) > 4 else f' ({sum(sizes)/1024:.0f} KB)'))


if __name__ == '__main__':
    sys.exit(main())
