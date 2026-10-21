import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Applies the character-font and character-preference study settings to <html>
 * so the shared `--font-chinese` token follows them across every surface.
 */
export function useCharacterFont() {
  const characterFont = useAppStore((state) => state.characterFont);
  const characterPreference = useAppStore((state) => state.characterPreference);

  useEffect(() => {
    document.documentElement.dataset.characterFont = characterFont;
  }, [characterFont]);

  useEffect(() => {
    document.documentElement.dataset.characterPreference = characterPreference;
  }, [characterPreference]);

  useEffect(() => {
    // Default Huninn ships with the shell; only the chosen alternative is parsed.
    const loading = characterFont === 'kai'
      ? characterPreference === 'simplified' ? import('../styles/fonts.generated.css?family=LXGW-WenKai') : import('../styles/fonts.generated.css?family=TW-EduKai')
      : characterPreference === 'simplified' ? import('../styles/fonts.generated.css?family=Rounded-SC') : null;
    void loading?.catch(() => {}); // Native Chinese fonts remain usable when offline.
  }, [characterFont, characterPreference]);
}
