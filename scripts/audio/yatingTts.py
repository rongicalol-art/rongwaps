"""Yating TTS client for the dev-only audio scripts (https://developer.yating.tw, v2 short speech).

The key comes from YATING_API_KEY in the environment or the repo's .env (the main checkout's, found by walking up
from the working directory); it is never printed. Every call is cached by its request body, so re-running a script
never pays for the same clip twice. Returns 16-bit WAV bytes.
"""
import base64
import hashlib
import json
import os
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://tts.api.yating.tw/v2/speeches/short"
VOICES = {
    "zh_en_female_1": "雅婷 (female)",
    "zh_en_female_2": "意晴 (female)",
    "zh_en_male_1": "家豪 (male)",
    "zh_en_male_2": "志明 (male)",
}
CACHE = Path("output/yating-cache")
MAX_CONNECTIONS = threading.BoundedSemaphore(3)  # Yating allows 3 requests at once per key.


def api_key():
    key = os.environ.get("YATING_API_KEY")
    if key:
        return key
    for root in (Path.cwd(), *Path.cwd().parents):
        env = root / ".env"
        if env.is_file():
            for line in env.read_text().splitlines():
                if line.strip().startswith("YATING_API_KEY="):
                    return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit("YATING_API_KEY is not set: add it to the repo's .env")


def synthesize(text, model, *, speed=1.0, pitch=1.0, energy=1.0, rate="22K", ssml=False):
    body = {
        "input": {"text": text, "type": "ssml" if ssml else "text"},
        "voice": {"model": model, "speed": speed, "pitch": pitch, "energy": energy},
        "audioConfig": {"encoding": "LINEAR16", "sampleRate": rate},
    }
    raw = json.dumps(body, ensure_ascii=False, sort_keys=True).encode()
    cached = CACHE / f"{hashlib.sha256(raw).hexdigest()[:20]}.wav"
    if cached.exists():
        return cached.read_bytes()
    request = urllib.request.Request(ENDPOINT, data=raw, method="POST",
                                     headers={"key": api_key(), "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with MAX_CONNECTIONS, urllib.request.urlopen(request, timeout=60) as response:
                audio = base64.b64decode(json.loads(response.read())["audioContent"])
            CACHE.mkdir(parents=True, exist_ok=True)
            cached.write_bytes(audio)
            return audio
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")[:300]
            if error.code >= 500 or "busy" in detail.lower() or "max connection" in detail.lower():
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"Yating {error.code}: {detail}") from None
        except (urllib.error.URLError, TimeoutError, ConnectionError):  # A slow or dropped answer: try again.
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("Yating did not answer after 5 tries")
