"""Word start times in Start here teacher clips, by MMS forced alignment (torchaudio).

  output/align-venv/bin/python scripts/audio/alignStartHereWords.py <clips.json> <audio dir>

clips.json maps a clip id to its spoken English text. Prints JSON {clip id: [[word, start ms], ...]}. Words are counted
like `spokenWords` in src/screens/start-here/data/talkParser.ts: lower case, letters and apostrophes only.
Run by scripts/audio/startHereCueTimes.ts; uses the same environment as alignVocabularyExampleAudio.py.
"""
import json
import re
import subprocess
import sys

import torch
import torchaudio

clips = json.load(open(sys.argv[1]))
audio_dir = sys.argv[2]
bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False)
tokenizer = bundle.get_tokenizer()
aligner = bundle.get_aligner()

out = {}
for clip_id, text in clips.items():
    words = [w for w in re.sub(r"[^a-z' ]", ' ', text.lower().replace('’', "'")).split() if w]
    pcm = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', f'{audio_dir}/{clip_id}.mp3', '-ac', '1', '-ar',
                          str(bundle.sample_rate), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    wave = torch.frombuffer(bytearray(pcm), dtype=torch.float32).unsqueeze(0)
    with torch.inference_mode():
        emission, _ = model(wave)
        spans = aligner(emission[0], tokenizer(words))
    ms_per_frame = wave.shape[1] / emission.shape[1] / bundle.sample_rate * 1000
    out[clip_id] = [[word, round(span[0].start * ms_per_frame)] for word, span in zip(words, spans)]
print(json.dumps(out))
