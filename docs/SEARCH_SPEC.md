# Advanced Chinese Dictionary Search Architecture
*Blueprint for High-Performance Postgres/Supabase NLP Search*

To transform a flat CC-CEDICT database into a lightning-fast, highly relevant autocomplete engine, we need to bridge PostgreSQL's native fuzzy-matching extensions with a dynamic scoring algorithm. 

This document outlines the end-to-end strategy, including database schema, enrichment scripts, and architectural trade-offs.

---

## 1. Database Schema & Indexing (`/supabase/migrations/`)

You must shape your data so PostgreSQL can search Hanzi, Pinyin, and English simultaneously without table scans.

**Key Concepts:**
*   **Trigram Indexes (`pg_trgm`):** This breaks strings into 3-character chunks. It makes `ILIKE '%word%'` lightning fast for Chinese characters and Pinyin substrings.
*   **Full-Text Search (`tsvector`):** We convert the JSON array of definitions into an English `tsvector`. This allows Postgres to do word-stemming (searching "running" finds "run").
*   **Pinyin Flattening:** We store `pinyin_flat` (e.g., `zenme`) alongside `pinyin_accented` (`zěn me`). This is crucial for tone-agnostic lookups.

*(See `/supabase/migrations/20260521_dictionary_search.sql` for the exact DDL to create the tables, generation columns, and GIN indices).*

---

## 2. Advanced Ranking & "The How Problem"

If a user searches **"how"**, how do we prevent the word "show" or "somehow" from outranking "怎麼"?

### The Scoring Algorithm (Implemented in the RPC)

We use a custom Supabase RPC function (`search_dictionary`) that executes a weighted calculus:
$$Score = (M_{weight} \times 100) + F_{score} - (L_{level} \times 10) + B_{bonus}$$

The RPC evaluates `M_{weight}` on-the-fly:
1.  **Exact JSON Array Match (`@>`) [Weight: 0.9]:** If "how" is an exact element in the `definitions` array (e.g., `["how", "what"]`), it instantly gets a massive boost. This inherently solves the "How/Show" problem.
2.  **Full Text Rank (`ts_rank`) [Weight: ~0.5]:** If it's just a substring in a long sentence, it gets a much lower multiplier.
3.  **Flat Pinyin Prefix (`LIKE 'zenm%'`) [Weight: 0.8]:** Autocomplete favors words starting with the exact query string before looking at internal substrings.

---

## 3. Data Enrichment Strategy (SUBTLEX-CH & TOCFL)

You need a localized migration script. Since CC-CEDICT's `traditional` character strings aren't uniquely keyed (heteronyms exist, e.g., 行 can be `xing` or `hang`), you must merge carefully.

### Enrichment Workflow (Node.js Script)
1.  **Extract:** Download the TOCFL vocabulary CSV and the SUBTLEX-CH word frequencies CSV.
2.  **Transform (SUBTLEX-CH):** SUBTLEX uses occurrences per million. You should normalize this to a logarithmic `frequency_score` (e.g., `Math.log10(count + 1)`). A word that appears 1,000,000 times will have a score of `6.0`, giving a smooth +6 bump in our RPC formula.
3.  **Load (SQL Update):** 
    Run a batch update using standard Node.js Postgres client or Supabase Admin client:
    ```sql
    UPDATE dictionary 
    SET frequency_score = $1, curriculum_level = $2 
    WHERE traditional = $3;
    ```
    *Note: Apply to ALL heteronyms of the character if Pinyin is missing from the frequency data list.*

### Book Vocab Synchronization
Your local "Book Vocabulary" should be a lightweight junction table linking a curriculum `book_id` to a `traditional` character string. A Postgres trigger or nightly sync can update the `is_book_vocab = TRUE` flag directly on the `dictionary` table to cache the `B_bonus` for instant retrieval.

---

## 4. Invisible Polish & Architectural Trade-offs

### Problem A: Maximum Munch (Syllable Splitting)
If a user types `xian`, did they mean `xi'an` (西安) or `xian` (先)?
*   **Postgres Solution:** Difficult to do perfectly natively.
*   **Application Layer Solution:** In your React/TypeScript frontend hook, use a greedy Regex parsing utility to split the user's pinyin string into valid syllables *before* sending it to Supabase. If ambiguous, send an `OR` query: Search both `pinyin_flat LIKE 'xi an%'` and `pinyin_flat LIKE 'xian%'`.

### Problem B: The "Latency" Trade-off (Server vs. Client)
Right now, executing a Postgres FTS query via Supabase Rest/RPC takes ~50-150ms. For purely local UI autocomplete ("Zero-Latency"), this feels sluggish compared to native apps like Pleco.

**The Hybrid Client-Trie Architecture (Highly Recommended):**
1.  **Client-Side Trie:** On app boot, stream a heavily compressed JSON packet containing ONLY `[Pinyin_flat, Traditional, ID]` (roughly 1.5MB after gzip for top 30,000 words). Load this into memory using an IndexedDB-backed prefix Trie.
2.  **Instant Pinyin:** When the user types `zen`, the Trie resolves instantly (< 1ms). Render the Hanzi suggestions immediately.
3.  **Deep Search Fallback:** When the user presses "Enter" or types English characters, bypass the Trie and fire the Supabase RPC for deep FTS and ranking.

By offloading Pinyin completion to the client and leveraging Postgres for English definitions, ranking, and long-tail data, you achieve a Pleco-quality instant experience within a web tech stack.
