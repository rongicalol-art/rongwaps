import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authService,
  getOAuthCallbackErrorMessage,
  getOAuthLoginErrorMessage,
  getOAuthRedirectUrl,
  SIGNUPS_FULL_MESSAGE,
  closedSignInMessage,
} from '../../src/services/authService';
import { supabase } from '../../src/services/supabaseClient';
import { SupabaseClient, type AuthChangeEvent, type Session, type User } from '@supabase/supabase-js';

test('production Google sign-in returns to the canonical app domain', () => {
  assert.equal(
    getOAuthRedirectUrl('https://rongwaps.onrender.com', true),
    'https://ronsmandarin.com/',
  );
});

test('local Google sign-in returns to the current origin', () => {
  assert.equal(
    getOAuthRedirectUrl('http://localhost:3000', false),
    'http://localhost:3000/',
  );
});

test('a staging production build keeps Google sign-in on its configured app', () => {
  assert.equal(
    getOAuthRedirectUrl('https://untrusted.example', true, 'https://ronsmandarin-staging.onrender.com/'),
    'https://ronsmandarin-staging.onrender.com/',
  );
  assert.equal(
    getOAuthRedirectUrl('http://localhost:3000', false, 'https://ronsmandarin-staging.onrender.com/'),
    'http://localhost:3000/',
  );
  for (const url of ['http://staging.example/', 'https://user:password@staging.example/']) {
    assert.throws(() => getOAuthRedirectUrl('https://staging.example', true, url), /HTTPS app address/);
  }
});

test('callback without an auth error does not show an error', () => {
  assert.equal(getOAuthCallbackErrorMessage('?code=abc', ''), null);
});

test('school access rejection explains the required account without provider internals', () => {
  assert.equal(getOAuthCallbackErrorMessage('?error=access_denied&error_description=school_beta_only', ''), closedSignInMessage());
  assert.match(closedSignInMessage(Date.parse('2026-11-13T15:59:59Z')), /Shu-Te student/);
  assert.doesNotMatch(closedSignInMessage(Date.parse('2026-11-13T16:00:00Z')), /Shu-Te|school/);
  assert.equal(getOAuthCallbackErrorMessage('?error=access_denied&error_description=signups_full%3A+full', ''), SIGNUPS_FULL_MESSAGE);
  assert.match(getOAuthCallbackErrorMessage('', '#error=access_denied&error_description=account_blocked%3A+no') ?? '', /can’t sign in/);
  assert.equal(getOAuthCallbackErrorMessage('?error=access_denied&error_description=google_only%3A+x', ''), 'Sign in with a Google account whose email is verified.');
});

test('auth listener authorizes sessions and ignores a stale approval after sign-out', async (context) => {
  process.env.VITE_SUPABASE_URL = 'https://beta-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const auth = supabase.auth;
  let authEvent: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  let resolveBetaAccess: ((value: { data: boolean; error: null; status: number }) => void) | undefined;
  let nextBetaAccess = Promise.resolve({ data: true, error: null, status: 200 });
  const nextFullCourseAccess = Promise.resolve({ data: true, error: null, status: 200 });
  const session = { user: { id: 'school-fixture' } } as Session;
  const observed: Array<{ user: User | null; hasFullCourseAccess: boolean }> = [];
  context.mock.method(auth, 'getSession', async () => ({ data: { session: null }, error: null }));
  context.mock.method(auth, 'onAuthStateChange', (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    authEvent = callback;
    return { data: { subscription: { unsubscribe() {} } } };
  });
  const rpc = context.mock.method(SupabaseClient.prototype, 'rpc', (name: string) => (
    name === 'has_beta_access' ? nextBetaAccess : nextFullCourseAccess
  ));
  const signOut = context.mock.method(auth, 'signOut', async () => ({ error: null }));
  const stop = authService.onAuthStateChanged((user, hasFullCourseAccess) => observed.push({ user, hasFullCourseAccess }));
  const settle = () => new Promise(resolve => setTimeout(resolve, 15));
  try {
    await settle();
    authEvent?.('SIGNED_IN', session);
    await settle();
    assert.equal(observed.at(-1)?.user?.id, 'school-fixture');
    assert.equal(observed.at(-1)?.hasFullCourseAccess, true);
    assert.equal(rpc.mock.calls[0].arguments[0], 'has_beta_access');
    assert.equal(rpc.mock.calls[1].arguments[0], 'has_full_course_access');

    nextBetaAccess = Promise.resolve({ data: false, error: null, status: 200 });
    authEvent?.('SIGNED_IN', session);
    await settle();
    assert.equal(observed.at(-1)?.user, null);
    assert.equal(observed.at(-1)?.hasFullCourseAccess, false);
    assert.equal(signOut.mock.callCount(), 1);

    nextBetaAccess = new Promise(resolve => { resolveBetaAccess = resolve; }) as typeof nextBetaAccess;
    authEvent?.('TOKEN_REFRESHED', session);
    await settle();
    authEvent?.('SIGNED_OUT', null);
    await settle();
    resolveBetaAccess?.({ data: true, error: null, status: 200 });
    await settle();
    assert.equal(observed.at(-1)?.user, null, 'late RPC must not restore a signed-out account');
    assert.equal(observed.at(-1)?.hasFullCourseAccess, false);
  } finally {
    stop();
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

test('a session whose token carries the school decision starts without any access RPC', async (context) => {
  process.env.VITE_SUPABASE_URL = 'https://beta-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const auth = supabase.auth;
  const claims = (value: object) => `e30.${Buffer.from(JSON.stringify(value)).toString('base64url')}.sig`;
  const stamped = { user: { id: 'stamped-student' }, access_token: claims({ sub: 'stamped-student', school_beta: true, full_course: false }) } as Session;
  const legacy = { user: { id: 'legacy-student' }, access_token: claims({ sub: 'legacy-student' }) } as Session;
  let authEvent: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  context.mock.method(auth, 'getSession', async () => ({ data: { session: stamped }, error: null }));
  context.mock.method(auth, 'onAuthStateChange', (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    authEvent = callback;
    return { data: { subscription: { unsubscribe() {} } } };
  });
  const rpc = context.mock.method(SupabaseClient.prototype, 'rpc', async () => ({ data: true, error: null, status: 200 }));
  const observed: Array<{ user: User | null; hasFullCourseAccess: boolean }> = [];
  const stop = authService.onAuthStateChanged((user, hasFullCourseAccess) => observed.push({ user, hasFullCourseAccess }));
  const settle = () => new Promise(resolve => setTimeout(resolve, 15));
  try {
    await settle();
    assert.equal(observed.at(-1)?.user?.id, 'stamped-student');
    assert.equal(observed.at(-1)?.hasFullCourseAccess, false, 'the stamped grant is used as is');
    assert.equal(rpc.mock.callCount(), 0, 'no round trips before the app opens');
    authEvent?.('TOKEN_REFRESHED', legacy);
    await settle();
    assert.equal(observed.at(-1)?.user?.id, 'legacy-student');
    assert.deepEqual(rpc.mock.calls.map(call => call.arguments[0]), ['has_beta_access', 'has_full_course_access'], 'older tokens still ask the database');
  } finally {
    stop();
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

test('redirect callback failure is plain for learners, names the allowlist fix locally, never exposes details', () => {
  const message = getOAuthCallbackErrorMessage(
    '?error=server_error&error_description=Redirect%20URL%20denied%20for%20private-user@example.com',
    '',
  );

  assert.doesNotMatch(message ?? '', /Supabase|Redirect/);
  assert.match(getOAuthCallbackErrorMessage('?error=server_error&error_description=Redirect%20URL%20denied', '', true) ?? '', /https:\/\/ronsmandarin\.com\//);
  assert.doesNotMatch(message ?? '', /private-user@example\.com/);
});

test('a project with sign-ups switched off says so instead of blaming the return address', () => {
  const message = getOAuthCallbackErrorMessage(
    '', '#error=server_error&error_code=signup_disabled&error_description=Signups+not+allowed+for+this+instance',
  );
  assert.equal(message, 'New accounts can’t be created right now. Please try again later.');
  assert.match(getOAuthLoginErrorMessage(new Error('Signups not allowed for this instance'), true), /Allow new users to sign up/);
  assert.doesNotMatch(getOAuthLoginErrorMessage(new Error('Signups not allowed for this instance'), true), /return address/);
});

test('cancelled Google sign-in is explained without treating it as a server failure', () => {
  assert.equal(
    getOAuthCallbackErrorMessage('?error=access_denied', ''),
    'Google sign-in was cancelled. Try again when you’re ready.',
  );
});

test('disabled Google provider points to Supabase provider settings only in local builds', () => {
  assert.match(getOAuthLoginErrorMessage(new Error('Unsupported provider: google'), true), /Authentication → Sign In \/ Providers/);
  assert.equal(getOAuthLoginErrorMessage(new Error('Unsupported provider: google')), 'Sign-in isn’t available right now. Please try again later.');
});

test('missing Supabase client settings name the build variables to check', () => {
  const message = getOAuthLoginErrorMessage(new Error('Supabase is not configured for this local environment.'), true);

  assert.match(message, /VITE_SUPABASE_URL/);
  assert.match(message, /VITE_SUPABASE_ANON_KEY/);
});

test('unknown OAuth errors do not leak provider details to the sign-in screen', () => {
  const message = getOAuthLoginErrorMessage(new Error('internal response with user@example.com'));

  assert.equal(message, 'Google sign-in could not start. Please try again.');
  assert.doesNotMatch(message, /user@example\.com/);
});

test('a public account before the age step reaches the app as needing it; confirming refreshes the token', async (context) => {
  process.env.VITE_SUPABASE_URL = 'https://beta-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const auth = supabase.auth;
  const claims = (value: object) => `e30.${Buffer.from(JSON.stringify(value)).toString('base64url')}.sig`;
  const before = { user: { id: 'public-learner' }, access_token: claims({ sub: 'public-learner', school_beta: true, full_course: false, age_ok: false }) } as Session;
  const after = { user: { id: 'public-learner' }, access_token: claims({ sub: 'public-learner', school_beta: true, full_course: false, age_ok: true }) } as Session;
  let authEvent: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  context.mock.method(auth, 'getSession', async () => ({ data: { session: before }, error: null }));
  context.mock.method(auth, 'onAuthStateChange', (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    authEvent = callback;
    return { data: { subscription: { unsubscribe() {} } } };
  });
  const rpc = context.mock.method(SupabaseClient.prototype, 'rpc', async () => ({ data: '2026-11-04T00:00:00Z', error: null, status: 200 }));
  const refresh = context.mock.method(auth, 'refreshSession', async () => {
    authEvent?.('TOKEN_REFRESHED', after);
    return { data: { session: after, user: after.user }, error: null };
  });
  const observed: Array<boolean | undefined> = [];
  const stop = authService.onAuthStateChanged((_user, _fullCourse, ageOk) => observed.push(ageOk));
  const settle = () => new Promise(resolve => setTimeout(resolve, 15));
  try {
    await settle();
    assert.equal(observed.at(-1), false, 'the age step is due');
    await authService.confirmAge();
    await settle();
    assert.equal(rpc.mock.calls[0].arguments[0], 'confirm_age');
    assert.equal(refresh.mock.callCount(), 1);
    assert.equal(observed.at(-1), true, 'the refreshed token opens the app');
  } finally {
    stop();
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});
