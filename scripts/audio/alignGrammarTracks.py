#!/usr/bin/env python3
"""Align grammar table rows and examples against the book's grammar tracks.

Run: output/align-venv/bin/python scripts/audio/alignGrammarTracks.py L01 [L02 ...]
Writes: content/audio/grammar_track_clips.json, output/grammar-audio/near-misses.json,
lesson reports/review pages and the accepted and near-miss audio clips.
"""
import argparse
import html
import json
import math
import re
import subprocess
import unicodedata
from dataclasses import dataclass, replace
from functools import lru_cache
from pathlib import Path

import torch
from align_mms import bundle, decode_audio, normalize_to_syllables

ROOT = Path(__file__).resolve().parents[2]
AUDIO_DIR = ROOT / "output/official-audio/book1"
GRAMMAR_DIR = ROOT / "content/grammar"
CLIPS_FILE = ROOT / "content/audio/grammar_track_clips.json"
APPROVALS_FILE = ROOT / "content/audio/grammar_track_approved.json"
REPORT_DIR = ROOT / "output/grammar-audio"
NEAR_MISSES_FILE = REPORT_DIR / "near-misses.json"
NEAR_MISS_CLIPS_DIR = REPORT_DIR / "near-miss-clips"
NEAR_MISS_REPORT_FILE = REPORT_DIR / "near-misses-review.md"
SILENCE_FILTER = "silencedetect=noise=-40dB:d=0.3"  # Split on pauses of at least 0.3 seconds.
MAX_WINDOW_CHUNKS = 4  # Keep candidate windows small enough to reject extra narration.
MIN_MEAN_SCORE = 0.85  # Require a high average forced-alignment score.
MIN_SYLLABLE_SCORE = 0.5  # Reject any syllable with weak alignment confidence.
NEAR_MISS_MIN_MEAN_SCORE = 0.78  # Queue clean candidates close to the strict score threshold for human review.
NEAR_MISS_MIN_SYLLABLE_SCORE = 0.30  # Allow one weak syllable in a human-reviewed candidate.
COVERAGE_EDGE_SECONDS = 0.75  # The example must start and finish close to the window edges.
MAX_ONSET_GAP_SECONDS = 0.9  # Keep every syllable onset close to the next one.
MAX_BOUNDARY_GAP_SECONDS = 2.5  # Allow a longer onset gap at punctuation and turn boundaries.
MAX_SYLLABLE_SPAN_SECONDS = 0.8  # Reject a syllable stretched across unrelated speech.
CLIP_LEAD_SECONDS = 0.10  # Leave a little silence before a matched window.
CLIP_TAIL_SECONDS = 0.15  # Leave a little silence after a matched window.
TRACK_RE = re.compile(r"^B1-(\d{2})-([12])-3\.mp3$")


@dataclass(frozen=True)
class Chunk:
    index: int
    start: float
    end: float


@dataclass(frozen=True)
class Candidate:
    first_chunk: int
    last_chunk: int
    window_start: float
    window_end: float
    first_onset: float
    last_onset: float
    mean_score: float
    min_score: float
    first_offset: float
    last_gap: float
    onsets: tuple[float, ...]
    syllable_scores: tuple[float, ...]
    syllable_spans: tuple[float, ...]
    timing_violations: tuple[str, ...]
    weakest_index: int
    approved: str | None = None


@dataclass
class ItemResult:
    page: str
    item_type: str
    item_id: str
    text: str
    key: str
    lesson_id: int
    part_id: int
    selected: Candidate | None
    best_candidate: Candidate | None
    clip_start: float | None
    clip_end: float | None
    failure_reason: str
    near_miss: Candidate | None
    near_miss_start: float | None
    near_miss_end: float | None


def han_only(text: str) -> str:
    """Keep CJK ideographs, matching the client's Unicode Han-only key."""
    return "".join(
        char for char in text
        if unicodedata.name(char, "").startswith(("CJK UNIFIED IDEOGRAPH", "CJK COMPATIBILITY IDEOGRAPH"))
    )


def is_latin_letter(char: str) -> bool:
    """Recognize Latin-script letters, including accented and full-width forms."""
    return unicodedata.category(char).startswith("L") and "LATIN" in unicodedata.name(char, "")


def speaker_label_end(text: str, index: int) -> int | None:
    """Return the end of a Latin speaker label followed by either colon form."""
    if (index + 1 < len(text) and is_latin_letter(text[index])
            and text[index + 1] in "：:"):
        return index + 2
    return None


def syllabify_text(text: str) -> str:
    """Remove speaker labels and all Latin letters before syllabifying."""
    output = []
    index = 0
    while index < len(text):
        label_end = speaker_label_end(text, index)
        if label_end is not None:
            index = label_end
            continue
        if is_latin_letter(text[index]):
            index += 1
            continue
        output.append(text[index])
        index += 1
    return "".join(output)


def boundary_indices(text: str) -> set[int]:
    """Return Han-syllable indices before sentence punctuation or a new speaker."""
    boundaries = set()
    han_count = 0
    pending_boundary = False
    index = 0
    while index < len(text):
        label_end = speaker_label_end(text, index)
        if label_end is not None:
            if han_count:
                pending_boundary = True
            index = label_end
            continue

        char = text[index]
        if char in "。？！，、；：":  # The narrator pauses at commas too.
            if han_count:
                pending_boundary = True
        elif han_only(char):
            if pending_boundary and han_count:
                boundaries.add(han_count - 1)
            han_count += 1
            pending_boundary = False
        index += 1
    return boundaries


def parse_lesson_id(value: str) -> int:
    match = re.fullmatch(r"L?(\d{1,2})", value.upper())
    if not match or int(match.group(1)) < 1:
        raise argparse.ArgumentTypeError(f"invalid lesson id: {value}; use L01")
    return int(match.group(1))


def pattern_row_text(row: dict) -> str:
    """Join a row's traditional tokens in display order, including punctuation."""
    groups = row.get("columns") if "columns" in row else [
        row.get("subject", []), row.get("grammar", []), row.get("complement", []),
    ]
    return "".join(
        f"{token.get('prefix', '')}{token.get('traditional', '')}{token.get('suffix', '')}"
        for group in groups
        for token in group
    )


def page_items(page: dict):
    """Yield unlinked table rows first, then subsection rows, then examples."""
    for row in page.get("patternRows", []):
        if not row.get("exampleId"):
            yield "row", row["id"], pattern_row_text(row)
    for subsection in page.get("subsections", []):
        for row in subsection.get("patternRows", []):
            if not row.get("exampleId"):
                yield "row", row["id"], pattern_row_text(row)
    for example in page.get("examples", []):
        yield "example", example["id"], example.get("text", {}).get("traditional", "")


def load_parts(lesson_ids: set[int]) -> list[dict]:
    parts = []
    for path in sorted(GRAMMAR_DIR.glob("*.json")):
        source = json.loads(path.read_text(encoding="utf-8"))
        for key, part in source.items():
            if "_PART_" not in key or part.get("lessonId") not in lesson_ids:
                continue
            pages = [page for page in part.get("grammarPages", []) if any(page_items(page))]
            if pages:
                parts.append({
                    "lesson_id": part["lessonId"],
                    "part_id": part["partId"],
                    "pages": pages,
                    "source": path.name,
                })
    return sorted(parts, key=lambda part: (part["lesson_id"], part["part_id"]))


def speech_chunks(audio_file: Path, duration: float) -> list[Chunk]:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(audio_file),
         "-af", SILENCE_FILTER, "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )
    starts = [float(value) for value in re.findall(r"silence_start: (-?[\d.]+)", result.stderr)]
    ends = [float(value) for value in re.findall(r"silence_end: ([\d.]+)", result.stderr)]
    intervals = []
    cursor = 0.0
    for index, start in enumerate(starts):
        end = ends[index] if index < len(ends) else duration
        start = min(duration, max(cursor, start))
        end = min(duration, max(start, end))
        if start - cursor > 0.02:
            intervals.append((cursor, start))
        cursor = end
    if duration - cursor > 0.02:
        intervals.append((cursor, duration))
    return [Chunk(index, start, end) for index, (start, end) in enumerate(intervals)]


def clip_edges(chunks: list[Chunk], candidate: Candidate, duration: float) -> tuple[float, float]:
    first = chunks[candidate.first_chunk]
    last = chunks[candidate.last_chunk]
    previous_end = chunks[first.index - 1].end if first.index else 0.0
    next_start = chunks[last.index + 1].start if last.index + 1 < len(chunks) else duration
    lower_bound = max(0.0, previous_end)
    upper_bound = min(duration, next_start)
    start = max(round(first.start - CLIP_LEAD_SECONDS, 2), math.ceil(lower_bound * 100 - 1e-9) / 100)
    end = min(round(last.end + CLIP_TAIL_SECONDS, 2), math.floor(upper_bound * 100 + 1e-9) / 100)
    return start, end


def matching_approval(
    approvals: dict, key: str, track: str, start: float, end: float,
) -> str | None:
    approval = approvals.get(key)
    if not isinstance(approval, dict):
        return None
    if (approval.get("file") == track
            and approval.get("start") == start
            and approval.get("end") == end
            and isinstance(approval.get("approved"), str)):
        return approval["approved"]
    return None


def align_window(
    emission: torch.Tensor,
    frame_seconds: float,
    chunks: list[Chunk],
    first_chunk: int,
    last_chunk: int,
    syllables: list[dict],
    key: str,
    boundaries: set[int],
    dictionary: dict,
    aligner,
) -> Candidate | None:
    tokenized = []
    for syllable in syllables:
        tokens = [dictionary[char] for char in syllable["pinyin"] if char in dictionary]
        if not tokens:
            return None
        tokenized.append(tokens)

    window_start = chunks[first_chunk].start
    window_end = chunks[last_chunk].end
    frame_start = max(0, int(math.floor(window_start / frame_seconds)))
    frame_end = min(emission.size(0), int(math.ceil(window_end / frame_seconds)))
    if frame_end <= frame_start:
        return None
    try:
        spans = aligner(emission[frame_start:frame_end], tokenized)
    except (RuntimeError, ValueError, IndexError):
        return None
    if len(spans) != len(syllables) or any(not span for span in spans):
        return None

    syllable_scores = [sum(float(token.score) for token in span) / len(span) for span in spans]
    onsets = tuple((frame_start + span[0].start) * frame_seconds for span in spans)
    syllable_spans = tuple(
        (span[-1].end - span[0].start) * frame_seconds for span in spans
    )
    first_onset = onsets[0]
    last_onset = onsets[-1]
    first_offset = first_onset - window_start
    last_gap = window_end - last_onset
    timing_violations = []
    key_chars = list(key)
    for chunk_index in range(first_chunk, last_chunk + 1):
        chunk = chunks[chunk_index]
        if not any(chunk.start <= onset < chunk.end for onset in onsets):
            timing_violations.append(f"chunk {chunk.index + 1} contains no syllable onset")
    for index, (left, right) in enumerate(zip(onsets, onsets[1:])):
        gap = right - left
        is_boundary = index in boundaries
        limit = MAX_BOUNDARY_GAP_SECONDS if is_boundary else MAX_ONSET_GAP_SECONDS
        if gap <= 0:
            timing_violations.append(
                f"onsets for {key_chars[index]}→{key_chars[index + 1]} are not strictly increasing"
            )
        elif gap > limit:
            boundary_label = " across a sentence/turn boundary" if is_boundary else " without a sentence/turn boundary"
            timing_violations.append(
                f"onset gap {key_chars[index]}→{key_chars[index + 1]} is {gap:.2f}s "
                f"(> {limit:.2f}s{boundary_label})"
            )
    for index, duration in enumerate(syllable_spans):
        if duration > MAX_SYLLABLE_SPAN_SECONDS:
            timing_violations.append(
                f"syllable {key_chars[index]} spans {duration:.2f}s "
                f"(> {MAX_SYLLABLE_SPAN_SECONDS:.2f}s)"
            )
    return Candidate(
        first_chunk=first_chunk,
        last_chunk=last_chunk,
        window_start=window_start,
        window_end=window_end,
        first_onset=first_onset,
        last_onset=last_onset,
        mean_score=sum(syllable_scores) / len(syllable_scores),
        min_score=min(syllable_scores),
        first_offset=first_offset,
        last_gap=last_gap,
        onsets=onsets,
        syllable_scores=tuple(syllable_scores),
        syllable_spans=syllable_spans,
        timing_violations=tuple(timing_violations),
        weakest_index=min(range(len(syllable_scores)), key=syllable_scores.__getitem__),
    )


def candidate_key(candidate: Candidate) -> tuple[float, float, float, float]:
    return (
        candidate.mean_score,
        candidate.min_score,
        -(abs(candidate.first_offset) + candidate.last_gap),
        -candidate.window_start,
    )


def solve_ordered(items: list[tuple[str, list[Candidate]]]) -> list[Candidate | None]:
    """Keep approvals and examples first, then fill remaining windows in book order."""

    @lru_cache(maxsize=None)
    def best(item_index: int, next_chunk: int):
        if item_index == len(items):
            return (0, 0, 0, 0.0, 0.0, 0.0, 0.0, ())

        item_type, candidates = items[item_index]
        skipped = best(item_index + 1, next_chunk)
        best_solution = skipped[:7] + ((None,) + skipped[7],)
        for candidate in candidates:
            if candidate.first_chunk < next_chunk:
                continue
            tail = best(item_index + 1, candidate.last_chunk + 1)
            solution = (
                tail[0] + (1 if candidate.approved else 0),
                tail[1] + (1 if item_type == "example" else 0),
                tail[2] + 1,
                tail[3] + candidate.mean_score,
                tail[4] + candidate.min_score,
                tail[5] - abs(candidate.first_offset) - candidate.last_gap,
                tail[6] - candidate.window_start,
                (candidate,) + tail[7],
            )
            if solution[:7] > best_solution[:7]:
                best_solution = solution
        return best_solution

    return list(best(0, 0)[7])


def best_candidate(candidates: list[Candidate]) -> Candidate | None:
    return max(candidates, key=candidate_key) if candidates else None


def collect_item_results(parts: list[dict], model, dictionary, aligner, approvals: dict):
    by_lesson: dict[int, list[ItemResult]] = {}
    chunks_by_part: dict[tuple[int, int], tuple[list[Chunk], float]] = {}
    for part in parts:
        lesson_id = part["lesson_id"]
        part_id = part["part_id"]
        audio_name = f"B1-{lesson_id:02d}-{part_id}-3.mp3"
        audio_file = AUDIO_DIR / audio_name
        if not audio_file.exists():
            print(f"L{lesson_id:02d} part {part_id}: no grammar track {audio_name}; its items stay unmatched")
            continue
        waveform, duration = decode_audio(audio_file)
        with torch.inference_mode():
            emission, _ = model(waveform)
        emission = emission[0]
        frame_seconds = duration / emission.size(0)
        chunks = speech_chunks(audio_file, duration)
        chunks_by_part[(lesson_id, part_id)] = (chunks, duration)

        records = []
        seen_keys: dict[str, tuple[str, str]] = {}
        for page in part["pages"]:
            for item_type, item_id, text in page_items(page):
                key = han_only(text)
                if not key:
                    continue
                if key in seen_keys:
                    first_type, first_id = seen_keys[key]
                    records.append({
                        "page": page["id"], "item_type": item_type, "item_id": item_id,
                        "text": text, "key": key, "lesson_id": lesson_id, "part_id": part_id,
                        "possible": [], "accepted": [], "near_miss": None,
                        "near_miss_start": None, "near_miss_end": None,
                        "duplicate_of": f"{first_type} {first_id}",
                    })
                    continue
                seen_keys[key] = (item_type, item_id)
                syllables = normalize_to_syllables(syllabify_text(text))
                skip_reason = ""
                if len(syllables) != len(key):
                    skip_reason = (
                        f"{len(syllables)} syllables do not map one-per-character to "
                        f"{len(key)} Han characters (digits or another non-1:1 form)"
                    )
                boundaries = boundary_indices(text)
                possible: list[Candidate] = []
                accepted: list[Candidate] = []
                # Digits and 兒 don't map one syllable per character, so onsets can't be checked: leave them to the studio voice.
                one_per_char = len(syllables) == len(key)
                for first in range(len(chunks) if one_per_char else 0):
                    for count in range(1, MAX_WINDOW_CHUNKS + 1):
                        last = first + count - 1
                        if last >= len(chunks):
                            break
                        candidate = align_window(
                            emission, frame_seconds, chunks, first, last,
                            syllables, key, boundaries, dictionary, aligner,
                        )
                        if candidate is None:
                            continue
                        possible.append(candidate)
                        coverage_ok = (
                            abs(candidate.first_offset) <= COVERAGE_EDGE_SECONDS
                            and candidate.last_gap <= COVERAGE_EDGE_SECONDS
                        )
                        if candidate.timing_violations or not coverage_ok:
                            continue
                        if (candidate.mean_score >= MIN_MEAN_SCORE
                                and candidate.min_score >= MIN_SYLLABLE_SCORE):
                            start, end = clip_edges(chunks, candidate, duration)
                            approval = matching_approval(approvals, key, audio_name, start, end)
                            accepted.append(replace(candidate, approved=approval) if approval else candidate)

                strongest = best_candidate(possible)
                near_miss = None
                near_miss_start, near_miss_end = (None, None)
                if (not accepted and strongest is not None and not strongest.timing_violations
                        and strongest.mean_score >= NEAR_MISS_MIN_MEAN_SCORE
                        and strongest.min_score >= NEAR_MISS_MIN_SYLLABLE_SCORE
                        and abs(strongest.first_offset) <= COVERAGE_EDGE_SECONDS
                        and strongest.last_gap <= COVERAGE_EDGE_SECONDS):
                    near_miss = strongest
                    near_miss_start, near_miss_end = clip_edges(chunks, near_miss, duration)
                    approval = matching_approval(
                        approvals, key, audio_name, near_miss_start, near_miss_end,
                    )
                    if approval:
                        near_miss = replace(near_miss, approved=approval)
                        accepted.append(near_miss)
                records.append({
                    "page": page["id"],
                    "item_type": item_type,
                    "item_id": item_id,
                    "text": text,
                    "key": key,
                    "lesson_id": lesson_id,
                    "part_id": part_id,
                    "skip_reason": skip_reason,
                    "possible": possible,
                    "accepted": accepted,
                    "near_miss": near_miss,
                    "near_miss_start": near_miss_start,
                    "near_miss_end": near_miss_end,
                })

        selected = solve_ordered([
            (record["item_type"], record["accepted"]) for record in records
        ])
        results = by_lesson.setdefault(lesson_id, [])
        for record, match in zip(records, selected):
            # A clean window proves its sentence on its own: book order only breaks ties, never rejects.
            if match is None and record["accepted"]:
                match = best_candidate(record["accepted"])
            strongest = best_candidate(record["possible"])
            reason = ""
            if match is None:
                if record.get("duplicate_of"):
                    reason = f"duplicate Han key; retained earlier {record['duplicate_of']}"
                elif record["accepted"]:
                    reason = "ordering rule: no non-overlapping increasing-time assignment remained"
                elif strongest is None:
                    reason = record.get("skip_reason") or "no window could align every syllable"
                else:
                    problems = []
                    problems.extend(strongest.timing_violations)
                    if strongest.mean_score < MIN_MEAN_SCORE:
                        problems.append(f"mean {strongest.mean_score:.3f} < {MIN_MEAN_SCORE:.2f}")
                    if strongest.min_score < MIN_SYLLABLE_SCORE:
                        problems.append(f"minimum syllable {strongest.min_score:.3f} < {MIN_SYLLABLE_SCORE:.2f}")
                    if abs(strongest.first_offset) > COVERAGE_EDGE_SECONDS:
                        problems.append(f"first onset is {abs(strongest.first_offset):.2f}s from window start")
                    if strongest.last_gap > COVERAGE_EDGE_SECONDS:
                        problems.append(f"last onset is {strongest.last_gap:.2f}s before window end")
                    reason = "best window rejected: " + "; ".join(problems)
            clip_start, clip_end = clip_edges(chunks, match, duration) if match else (None, None)
            results.append(ItemResult(
                page=record["page"],
                item_type=record["item_type"],
                item_id=record["item_id"],
                text=record["text"],
                key=record["key"],
                lesson_id=lesson_id,
                part_id=part_id,
                selected=match,
                best_candidate=strongest,
                clip_start=clip_start,
                clip_end=clip_end,
                failure_reason=reason,
                near_miss=record["near_miss"],
                near_miss_start=record["near_miss_start"],
                near_miss_end=record["near_miss_end"],
            ))
    return by_lesson, chunks_by_part


def item_label(result: ItemResult) -> str:
    return "Row" if result.item_type == "row" else "Example"


def markdown_report(results: list[ItemResult], chunks: list[Chunk]) -> str:
    claimed = set()
    lines = []
    for page in dict.fromkeys(result.page for result in results):
        page_results = [result for result in results if result.page == page]
        lines.extend([f"### {page}", ""])
        for result in page_results:
            lines.append(f"- **{item_label(result)} `{result.item_id}`** — `{result.text}`")
            if result.selected:
                match = result.selected
                claimed.update(range(match.first_chunk, match.last_chunk + 1))
                syllable_onsets = ", ".join(
                    f"{char} {onset:.2f}s" for char, onset in zip(result.key, match.onsets)
                )
                lines.append(
                    f"  - Matched chunks {match.first_chunk + 1}–{match.last_chunk + 1} "
                    f"({match.window_start:.2f}–{match.window_end:.2f}s); "
                    f"clip {result.clip_start:.2f}–{result.clip_end:.2f}s; "
                    f"mean {match.mean_score:.3f}, min {match.min_score:.3f}; "
                    f"edge offset {match.first_offset:+.2f}s / final onset {match.last_gap:.2f}s before end."
                )
                lines.append(f"  - Syllable onsets: {syllable_onsets}.")
            else:
                lines.append(f"  - Unmatched: {result.failure_reason}.")
                if result.best_candidate:
                    best = result.best_candidate
                    lines.append(
                        f"    Best tried window {best.first_chunk + 1}–{best.last_chunk + 1} "
                        f"({best.window_start:.2f}–{best.window_end:.2f}s), mean {best.mean_score:.3f}, "
                        f"min {best.min_score:.3f}, edge offset {best.first_offset:+.2f}s / "
                        f"final onset {best.last_gap:.2f}s before end."
                    )
        lines.append("")
    lines.extend(["### Unclaimed speech chunks", ""])
    if not chunks:
        lines.append("No speech chunks detected.")
    else:
        for chunk in chunks:
            if chunk.index not in claimed:
                lines.append(f"- Chunk {chunk.index + 1}: {chunk.start:.2f}–{chunk.end:.2f}s ({chunk.end - chunk.start:.2f}s).")
    lines.append("")
    return "\n".join(lines)


def cut_clip(audio_file: Path, start: float, end: float, clip_file: Path) -> None:
    clip_file.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{start:.2f}",
         "-i", str(audio_file), "-t", f"{end - start:.2f}", "-codec:a", "libmp3lame",
         "-q:a", "4", str(clip_file)],
        check=True,
    )


def write_clips(results_by_lesson: dict[int, list[ItemResult]]) -> None:
    clips = json.loads(CLIPS_FILE.read_text(encoding="utf-8")) if CLIPS_FILE.exists() else {}
    for lesson_id in results_by_lesson:
        clips = {
            key: value for key, value in clips.items()
            if not (isinstance(value, dict)
                    and (match := TRACK_RE.fullmatch(value.get("file", "")))
                    and int(match.group(1)) == lesson_id)
        }
    written_keys = set(clips)
    for lesson_id, results in results_by_lesson.items():
        for result in results:
            if result.selected is None or result.key in written_keys:
                continue
            track = f"B1-{lesson_id:02d}-{result.part_id}-3.mp3"
            entry = {
                "file": track,
                "start": result.clip_start,
                "end": result.clip_end,
                "score": round(result.selected.mean_score, 3),
                "minScore": round(result.selected.min_score, 3),
                "onsets": [round(onset, 2) for onset in result.selected.onsets],
                "page": result.page,
            }
            entry["rowId" if result.item_type == "row" else "exampleId"] = result.item_id
            if result.selected.approved:
                entry["approved"] = result.selected.approved
            clips[result.key] = entry
            written_keys.add(result.key)
    CLIPS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CLIPS_FILE.write_text(json.dumps(clips, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def near_miss_entry(result: ItemResult) -> dict | None:
    if result.near_miss is None:
        return None
    entry = {
        "key": result.key,
        "page": result.page,
        "text": result.text,
        "file": f"B1-{result.lesson_id:02d}-{result.part_id}-3.mp3",
        "start": result.near_miss_start,
        "end": result.near_miss_end,
        "score": round(result.near_miss.mean_score, 3),
        "minScore": round(result.near_miss.min_score, 3),
        "onsets": [round(onset, 2) for onset in result.near_miss.onsets],
    }
    entry["rowId" if result.item_type == "row" else "exampleId"] = result.item_id
    return entry


def write_near_misses(results_by_lesson: dict[int, list[ItemResult]]) -> None:
    lesson_ids = set(results_by_lesson)
    previous = json.loads(NEAR_MISSES_FILE.read_text(encoding="utf-8")) if NEAR_MISSES_FILE.exists() else []
    entries = [entry for entry in previous if not (
        isinstance(entry, dict)
        and (match := TRACK_RE.fullmatch(entry.get("file", "")))
        and int(match.group(1)) in lesson_ids
    )]
    current = [entry for results in results_by_lesson.values() for result in results
               if (entry := near_miss_entry(result)) is not None]
    entries.extend(current)
    entries.sort(key=lambda entry: (entry["file"], entry["page"], entry.get("rowId", entry.get("exampleId", ""))))
    NEAR_MISSES_FILE.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    NEAR_MISS_CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    for clip_file in NEAR_MISS_CLIPS_DIR.glob("B1L??-*.mp3"):
        lesson_match = re.match(r"B1L(\d{2})-", clip_file.name)
        if lesson_match and int(lesson_match.group(1)) in lesson_ids:
            clip_file.unlink()
    for results in results_by_lesson.values():
        for result in results:
            if result.near_miss is None:
                continue
            audio_file = AUDIO_DIR / f"B1-{result.lesson_id:02d}-{result.part_id}-3.mp3"
            item_prefix = "row-" if result.item_type == "row" else ""
            filename = f"{result.page}-{item_prefix}{result.item_id}.mp3"
            cut_clip(audio_file, result.near_miss_start, result.near_miss_end, NEAR_MISS_CLIPS_DIR / filename)

    counts = {lesson_id: sum(1 for result in results if result.near_miss)
              for lesson_id, results in results_by_lesson.items()}
    lines = ["# Grammar audio near misses", "", "## Count per lesson", ""]
    lines.extend(f"- L{lesson_id:02d}: {count}" for lesson_id, count in sorted(counts.items()))
    lines.extend(["", "## Candidates", "", "| Type | Page | ID | Text | Score / min | Weakest syllable |", "| --- | --- | --- | --- | ---: | --- |"])
    for results in results_by_lesson.values():
        for result in results:
            candidate = result.near_miss
            if candidate is None:
                continue
            weakest = result.key[candidate.weakest_index]
            weakest_score = candidate.syllable_scores[candidate.weakest_index]
            lines.append(
                f"| {item_label(result)} | {result.page} | {result.item_id} | {result.text} | "
                f"{candidate.mean_score:.3f} / {candidate.min_score:.3f} | "
                f"{weakest} ({weakest_score:.3f}) |"
            )
    lines.append("")
    NEAR_MISS_REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")


def load_approvals() -> dict:
    if not APPROVALS_FILE.exists():
        return {}
    approvals = json.loads(APPROVALS_FILE.read_text(encoding="utf-8"))
    if not isinstance(approvals, dict):
        raise ValueError(f"{APPROVALS_FILE.relative_to(ROOT)} must contain a JSON object")
    return approvals


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lessons", nargs="+", type=parse_lesson_id, help="lesson ids such as L01")
    args = parser.parse_args()
    lesson_ids = set(args.lessons)
    parts = load_parts(lesson_ids)
    found_lessons = {part["lesson_id"] for part in parts}
    missing = sorted(lesson_ids - found_lessons)
    if missing:
        raise SystemExit(f"no grammar examples found for lesson(s): {', '.join(f'L{lesson:02d}' for lesson in missing)}")

    model = bundle.get_model()
    dictionary = bundle.get_dict()
    aligner = bundle.get_aligner()
    results_by_lesson, chunks_by_part = collect_item_results(parts, model, dictionary, aligner, load_approvals())
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    for lesson_id, results in results_by_lesson.items():
        part_results: dict[tuple[int, int], list[ItemResult]] = {}
        for result in results:
            part_results.setdefault((result.lesson_id, result.part_id), []).append(result)
        report_lines = [f"# L{lesson_id:02d} grammar audio review", ""]
        html_rows = []
        unmatched = []
        for part in parts:
            if part["lesson_id"] != lesson_id:
                continue
            part_id = part["part_id"]
            audio_file = AUDIO_DIR / f"B1-{lesson_id:02d}-{part_id}-3.mp3"
            if (lesson_id, part_id) not in chunks_by_part:
                report_lines.extend([f"## No grammar track for part {part_id}", ""])
                continue
            part_chunks, _duration = chunks_by_part[(lesson_id, part_id)]
            part_results_list = part_results.get((lesson_id, part_id), [])
            report_lines.extend([f"## Track {audio_file.name}", ""])
            report_lines.extend(markdown_report(part_results_list, part_chunks).splitlines())
            for result in part_results_list:
                if result.selected is None:
                    unmatched.append(result)
                    continue
                start, end = result.clip_start, result.clip_end
                item_prefix = "row-" if result.item_type == "row" else ""
                clip_name = f"clips/{result.page}-{item_prefix}{result.item_id}.mp3"
                cut_clip(audio_file, start, end, REPORT_DIR / clip_name)
                html_rows.append(
                    "<tr>"
                    f"<td>{item_label(result)}</td><td>{html.escape(result.page)}</td><td>{html.escape(result.item_id)}</td>"
                    f"<td lang=\"zh-Hant\">{html.escape(result.text)}</td>"
                    f"<td>{result.selected.mean_score:.3f} / {result.selected.min_score:.3f}</td>"
                    f"<td><audio controls preload=\"none\" src=\"{html.escape(clip_name)}\"></audio></td></tr>"
                )
        unmatched_lines = ["## Unmatched rows and examples", ""]
        if unmatched:
            for result in unmatched:
                unmatched_lines.append(
                    f"- **{item_label(result)} · {result.page} · {result.item_id}** — `{result.text}`: {result.failure_reason}."
                )
        else:
            unmatched_lines.append("None.")
        html_unmatched = "".join(
            f"<li><strong>{item_label(result)} · {html.escape(result.page)} · {html.escape(result.item_id)}</strong> "
            f"<span lang=\"zh-Hant\">{html.escape(result.text)}</span> — {html.escape(result.failure_reason)}</li>"
            for result in unmatched
        ) or "<li>None.</li>"
        html_text = """<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>L%02d grammar audio review</title>
<style>body{font:16px system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#222}table{border-collapse:collapse;width:100%%}th,td{text-align:left;padding:.6rem;border-bottom:1px solid #ddd}audio{max-width:260px}li{margin:.7rem 0}</style>
<h1>L%02d grammar audio review</h1>
<table><thead><tr><th>Type</th><th>Page</th><th>ID</th><th>Text</th><th>Mean / min</th><th>Clip</th></tr></thead><tbody>
%s
</tbody></table>
<h2>Unmatched rows and examples</h2><ul>%s</ul></html>
""" % (lesson_id, lesson_id, "\n".join(html_rows), html_unmatched)
        (REPORT_DIR / f"L{lesson_id:02d}-report.md").write_text("\n".join(report_lines + unmatched_lines) + "\n", encoding="utf-8")
        (REPORT_DIR / f"L{lesson_id:02d}-review.html").write_text(html_text, encoding="utf-8")

    write_clips(results_by_lesson)
    write_near_misses(results_by_lesson)
    for lesson_id, results in results_by_lesson.items():
        matched = sum(result.selected is not None for result in results)
        near_misses = sum(result.near_miss is not None for result in results)
        row_total = sum(result.item_type == "row" for result in results)
        row_matched = sum(result.item_type == "row" and result.selected is not None for result in results)
        print(f"L{lesson_id:02d}: {row_matched}/{row_total} rows and {matched - row_matched}/{len(results) - row_total} examples matched; {near_misses} near misses")
    print(f"Wrote {CLIPS_FILE.relative_to(ROOT)}")
    print(f"Wrote {NEAR_MISSES_FILE.relative_to(ROOT)} and near-miss clips")


if __name__ == "__main__":
    main()
