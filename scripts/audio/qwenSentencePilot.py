#!/usr/bin/env python3
"""Generate six intact sentence samples; no app, pack, or progress changes.

Uses the environment from qwenWordPilot.py. First run downloads Qwen 1.7B;
subsequent runs can use HF_HUB_OFFLINE=1. Serve output/qwen-sentence-pilot
with python -m http.server to compare on a phone. These are authored test
sentences, not textbook content or verified pronunciation records.
"""
import argparse
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/qwen-sentence-pilot"
MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit"
VOICE = "Vivian"
SENTENCES = [
    ("這件衣服很漂亮。", "这件衣服很漂亮。", "This piece of clothing is beautiful."),
    ("我喜歡學中文。", "我喜欢学中文。", "I like learning Chinese."),
    ("你今天想吃什麼？", "你今天想吃什么？", "What do you want to eat today?"),
]
STYLES = {
    "Natural": "用自然、温暖、有感情的普通话朗读，像在和朋友说话，语气轻松，停顿自然，不要夸张。",
    "Slower": "用温暖、有感情的普通话朗读。语速明显放慢，大约是正常语速的百分之七十。保持句子连贯，在词组之间自然停顿，不要机械地逐字读。",
}


def preview(words):
    template = Path(__file__).with_name("qwenWordPilot.html").read_text()
    style = re.search(r"<style>(.*?)</style>", template, re.S).group(1)
    css = (ROOT / "src/index.css").read_text()
    tokens = "\n".join(re.findall(r"^  --(?:color-|radius-|depth-)[^;]+;", css, re.M))
    style = style.replace("/* REPO_TOKENS */", tokens)
    articles = []
    for i, (text, _, meaning) in enumerate(SENTENCES):
        players = "".join(
            f'<label>{html.escape(w["style"])}<audio controls preload="metadata" '
            f'aria-label="{html.escape(w["style"] + ": " + text)}" '
            f'src="{w["file"]}"></audio></label>'
            for w in words if w["sentence"] == i
        )
        if not players:
            continue
        articles.append(f'<article><h2>{text}</h2><p>{meaning}</p>{players}</article>')
    reference = ('<p><a href="official-demo/">Compare with the official demo</a></p>'
                 if (OUT / "official-demo/index.html").exists() else "")
    OUT.joinpath("index.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Sentence listening · Ron’s Mandarin</title><style>' + style +
        'audio{display:block;width:100%;margin:6px 0 16px}a{color:var(--color-brand-primary-deep)}'
        '</style><main><h1>Listen to the sentences.</h1>'
        '<p>Qwen 1.7B · Vivian</p>' + "".join(articles) + reference +
        '</main><script>const players=[...document.querySelectorAll("audio")];'
        'players.forEach(p=>p.addEventListener("play",()=>players.forEach(other=>{'
        'if(other!==p)other.pause()})));</script></html>'
    )


def generate():
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    OUT.mkdir(parents=True, exist_ok=True)
    model = None
    words = []
    for i, (text, synthesis_text, meaning) in enumerate(SENTENCES):
        for style, instruct in STYLES.items():
            path = OUT / f"sentence-{i + 1}-{style.lower()}.wav"
            recipe = [MODEL, VOICE, synthesis_text, instruct, 42, 512]
            key = hashlib.sha256(json.dumps(recipe, ensure_ascii=False).encode()).hexdigest()
            key_path = path.with_suffix(".key")
            if not (path.exists() and key_path.exists() and key_path.read_text() == key):
                if model is None:
                    model = load_model(MODEL)
                mx.random.seed(42)
                results = list(model.generate(synthesis_text, voice=VOICE, lang_code="Chinese",
                                             instruct=instruct, max_tokens=512))
                if not results:
                    raise ValueError(f"No audio: {text} {style}")
                audio = np.concatenate([np.asarray(r.audio).reshape(-1) for r in results])
                if not len(audio) or not np.isfinite(audio).all() or np.max(np.abs(audio)) < .003:
                    raise ValueError(f"Invalid audio: {text} {style}")
                sf.write(path, audio, results[0].sample_rate, subtype="PCM_16")
                key_path.write_text(key)
            info = sf.info(path)
            words.append(dict(sentence=i, text=text, meaning=meaning, style=style,
                              synthesisText=synthesis_text, instruct=instruct, file=path.name,
                              duration=info.duration, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                              reviewStatus="needs-listening-review"))
            print(f"{text} {style}: {info.duration:.2f}s", flush=True)
    OUT.joinpath("manifest.json").write_text(json.dumps(
        dict(model=MODEL, voice=VOICE, samples=words), ensure_ascii=False, indent=2))
    preview(words)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()
    assert len(SENTENCES) == 3 and len(STYLES) == 2
    assert all(text and synth and meaning for text, synth, meaning in SENTENCES)
    assert all(instruct for instruct in STYLES.values())
    if args.self_check:
        print("Sentence pilot input checks passed")
    else:
        generate()
