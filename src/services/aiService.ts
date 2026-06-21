/**
 * @fileoverview Mnemonic service — re-exports from focused sub-modules.
 *
 * This file is kept for backward compatibility. New code should import
 * directly from the specific modules:
 *   - `mnemonicCache.ts` — cache read/write/clear operations
 *   - `mnemonicGenerator.ts` — AI generation functions
 *   - `mnemonicPreGenerator.ts` — background pre-generation queue
 */

export { clearAllMnemonics, fetchAllMnemonicsDebug, getCachedMnemonic, saveMnemonicToCache } from "./mnemonicCache";
export { generateMnemonic, generateWordMnemonic, getOrGenerateMnemonic } from "./mnemonicGenerator";
export { preGenerateMnemonics, getPreGenPendingCount } from "./mnemonicPreGenerator";