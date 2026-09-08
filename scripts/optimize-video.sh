#!/usr/bin/env bash
set -euo pipefail

# Optimization script for RongWaps background video loops
# Usage: ./scripts/optimize-video.sh <path_to_input.mp4> [output_dir]

INPUT="${1:-}"
OUTPUT_DIR="${2:-public/videos}"

if [ -z "$INPUT" ] || [ ! -f "$INPUT" ]; then
  echo "Error: Input file '$INPUT' does not exist."
  echo "Usage: $0 <path_to_input.mp4> [output_dir]"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "=== Processing video: $INPUT ==="
echo "Target output directory: $OUTPUT_DIR"

# 1. Generate optimized poster frame (JPEG + WebP)
echo "Generating poster frame..."
ffmpeg -y -ss 00:00:00.500 -i "$INPUT" -vframes 1 -q:v 2 "$OUTPUT_DIR/login-poster.jpg"
python3 -c "
from PIL import Image
im = Image.open('$OUTPUT_DIR/login-poster.jpg')
im.save('$OUTPUT_DIR/login-poster.webp', 'WEBP', quality=85)
"

# 2. Generate optimized MP4 (H.264, silent, faststart for instant streaming)
echo "Generating optimized MP4 (H.264)..."
ffmpeg -y -i "$INPUT" -an \
  -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p \
  -movflags +faststart \
  -vf "scale='min(1920,iw)':-2" \
  "$OUTPUT_DIR/login-bg.mp4"

# 3. Generate optimized WebM (VP9, silent, ultra-compressed for modern browsers)
echo "Generating optimized WebM (VP9)..."
ffmpeg -y -i "$INPUT" -an \
  -c:v libvpx-vp9 -crf 30 -b:v 0 -deadline good -cpu-used 2 \
  -vf "scale='min(1920,iw)':-2" \
  "$OUTPUT_DIR/login-bg.webm"

echo "=== Optimization Complete! ==="
ls -lh "$OUTPUT_DIR"/login-*
