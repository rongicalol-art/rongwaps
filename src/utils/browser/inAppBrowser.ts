/**
 * In-app browsers where Google refuses sign-in ("Error 403: disallowed_useragent"). In Taiwan most shared
 * links open inside LINE, so a newcomer there could never sign up and the app would never see the error.
 */
const IN_APP: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bLine\/\d/i, 'LINE'],
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/, 'Facebook'],
  [/MicroMessenger/i, 'WeChat'],
  [/BytedanceWebview|musical_ly|TikTok/i, 'TikTok'],
  [/KAKAOTALK/i, 'KakaoTalk'],
  [/Snapchat/i, 'Snapchat'],
];

/** The app whose built-in browser this is, or null for a real browser. */
export function inAppBrowser(userAgent: string): string | null {
  return IN_APP.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

/** LINE opens a page in the phone's own browser when asked with openExternalBrowser=1; null when already asked. */
export function lineExternalUrl(href: string): string | null {
  const url = new URL(href);
  if (url.searchParams.has('openExternalBrowser')) return null;
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
}
