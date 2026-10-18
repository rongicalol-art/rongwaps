/** Profile appearance is persisted locally and synced per account. */
export const AVATAR_COLORS = ['blue', 'honey', 'jade', 'plum', 'ink'] as const;
export const COVER_PRESETS = ['clay', 'ink', 'honey', 'jade', 'plum', 'plain'] as const;
export type ProfileSettings = {
  displayName: string;
  avatarColor: typeof AVATAR_COLORS[number];
  coverPreset: typeof COVER_PRESETS[number];
  avatarPath: string | null;
  coverPath: string | null;
}
export const PROFILE_DEFAULTS: ProfileSettings = {
  displayName: '', avatarColor: 'blue', coverPreset: 'clay', avatarPath: null, coverPath: null,
};
export interface ProfileState extends ProfileSettings {
  setProfile: (profile: ProfileSettings) => void;
}
export function createProfileSlice(set: (patch: Partial<ProfileState>) => void): ProfileState {
  return { ...PROFILE_DEFAULTS, setProfile: (profile) => set(profile) };
}
export const PROFILE_PERSISTED_KEYS = ['displayName', 'avatarColor', 'coverPreset', 'avatarPath', 'coverPath'] as const;
export const PROFILE_ACCOUNT_SWITCH_DEFAULTS = PROFILE_DEFAULTS;

/** Treat old rows and malformed settings as defaults. */
export function normalizeProfileSettings(value: Partial<Record<keyof ProfileSettings, unknown>>): ProfileSettings {
  return {
    displayName: typeof value.displayName === 'string' ? value.displayName.slice(0, 30) : '',
    avatarColor: AVATAR_COLORS.find((color) => color === value.avatarColor) ?? 'blue',
    coverPreset: COVER_PRESETS.find((preset) => preset === value.coverPreset) ?? 'clay',
    avatarPath: typeof value.avatarPath === 'string' ? value.avatarPath : null,
    coverPath: typeof value.coverPath === 'string' ? value.coverPath : null,
  };
}
