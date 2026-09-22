/**
 * Detects whether the web app is running in standalone display mode
 * (e.g. added to iOS Home Screen, Chrome PWA window, or Android TWA).
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Detects if the current user agent is an Apple mobile device (iOS/iPadOS).
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isAppleTouch = /iphone|ipad|ipod/.test(ua);
  const isIpadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isAppleTouch || isIpadOs;
}
