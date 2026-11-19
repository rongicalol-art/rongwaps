import { socialUpdateOpen } from '../../../shared/lobby';

let forced = false;

/**
 * Friends, private messages, offline profiles and the long class chat start with the privacy update
 * (SOCIAL_UPDATE_FROM). DEV: the classmate simulator turns them on early to try them.
 */
export const updateOpen = (now = Date.now()) => forced || socialUpdateOpen(now);
export function forceUpdateOpen(on: boolean) { if (import.meta.env.DEV) forced = on; }
