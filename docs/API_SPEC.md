# 🔌 Express API Specification

The backend server runs under Node.js + Express and provides the media proxy endpoint below.

---

## 🎴 Endpoints

### Audio Proxy
Proxies audio files from Supabase storage to avoid Safari CORS issues with external media streaming.
- **Method**: `GET`
- **Path**: `/api/audio/*` (e.g. `/api/audio/hsk1/xiu.mp3`)
- **Headers**: None required.
- **Responses**:
  - `200 OK`: Audio binary payload streamed directly with appropriate content type (`audio/mpeg`, `audio/wav`, etc.) and Cache-Control headers set to `public, max-age=86400`.
  - `404 Not Found`: File does not exist in storage bucket.
  - `500 Server Error`: Connection error.
