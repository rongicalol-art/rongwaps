# 🔌 Express API Specification

The backend server runs under Node.js + Express and provides two key endpoints to support character mnemonics generation and media proxies.

---

## 🎴 Endpoints

### 1. Generate Mnemonic
- **Method**: `POST`
- **Path**: `/api/generate-mnemonic`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <supabase_session_access_token>`
- **Request Body**:
  - `char` (string, optional) — The character to write a mnemonic for.
  - `word` (string, optional) — The word to write a mnemonic for.
  - `pinyin` (string, optional)
  - `definition` (string, optional)
  - `components` (array of `{ char, definition }`, optional) — Radicals/components of the character.
  - `charactersInfo` (array of `{ char, definition }`, optional) — Sub-characters of the word.
- **Example Payload**:
  ```json
  {
    "char": "休",
    "pinyin": "xiū",
    "definition": "to rest",
    "components": [
      { "char": "亻", "definition": "person" },
      { "char": "木", "definition": "tree" }
    ]
  }
  ```
- **Responses**:
  - `200 OK`: Returns the generated story text and tokens usage.
    ```json
    {
      "mnemonic": "A **person** (亻) resting against a **tree** (木), so this character means **to rest** (休).",
      "usage": {
        "promptTokenCount": 75,
        "candidatesTokenCount": 24,
        "totalTokenCount": 99
      }
    }
    ```
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `400 Bad Request`: Missing body content.
  - `500 Server Error`: Gemini API failure or DB connection issues.

---

### 2. Audio Proxy
Proxies audio files from Supabase storage to avoid Safari CORS issues with external media streaming.
- **Method**: `GET`
- **Path**: `/api/audio/*` (e.g. `/api/audio/hsk1/xiu.mp3`)
- **Headers**: None required.
- **Responses**:
  - `200 OK`: Audio binary payload streamed directly with appropriate content type (`audio/mpeg`, `audio/wav`, etc.) and Cache-Control headers set to `public, max-age=86400`.
  - `404 Not Found`: File does not exist in storage bucket.
  - `500 Server Error`: Connection error.
