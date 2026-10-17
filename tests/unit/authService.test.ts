import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authService,
  getOAuthCallbackErrorMessage,
  getOAuthLoginErrorMessage,
  getOAuthRedirectUrl,
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

test('callback without an auth error does not show an error', () => {
  assert.equal(getOAuthCallbackErrorMessage('?code=abc', ''), null);
});

test('school access rejection explains the required account without provider internals', () => {
  assert.match(getOAuthCallbackErrorMessage('?error=access_denied&error_description=school_beta_only', '') ?? '', /Shu-Te student/);
});

test('auth listener authorizes sessions and ignores a stale approval after sign-out', async (context) => {
  process.env.VITE_SUPABASE_URL = 'https://beta-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const auth = supabase.auth;
  let authEvent: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  let resolveAccess: ((value: { data: boolean; error: null; status: number }) => void) | undefined;
  let nextAccess = Promise.resolve({ data: true, error: null, status: 200 });
  const session = { user: { id: 'school-fixture' } } as Session;
  const observed: Array<User | null> = [];
  context.mock.method(auth, 'getSession', async () => ({ data: { session: null }, error: null }));
  context.mock.method(auth, 'onAuthStateChange', (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    authEvent = callback;
    return { data: { subscription: { unsubscribe() {} } } };
  });
  const rpc = context.mock.method(SupabaseClient.prototype, 'rpc', () => nextAccess);
  const signOut = context.mock.method(auth, 'signOut', async () => ({ error: null }));
  const stop = authService.onAuthStateChanged(user => observed.push(user));
  const settle = () => new Promise(resolve => setTimeout(resolve, 15));
  try {
    await settle();
    authEvent?.('SIGNED_IN', session);
    await settle();
    assert.equal(observed.at(-1)?.id, 'school-fixture');
    assert.equal(rpc.mock.calls[0].arguments[0], 'has_beta_access');

    nextAccess = Promise.resolve({ data: false, error: null, status: 200 });
    authEvent?.('SIGNED_IN', session);
    await settle();
    assert.equal(observed.at(-1), null);
    assert.equal(signOut.mock.callCount(), 1);

    nextAccess = new Promise(resolve => { resolveAccess = resolve; }) as typeof nextAccess;
    authEvent?.('TOKEN_REFRESHED', session);
    await settle();
    authEvent?.('SIGNED_OUT', null);
    await settle();
    resolveAccess?.({ data: true, error: null, status: 200 });
    await settle();
    assert.equal(observed.at(-1), null, 'late RPC must not restore a signed-out account');
  } finally {
    stop();
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

test('redirect callback failure gives the Supabase allowlist fix without exposing details', () => {
  const message = getOAuthCallbackErrorMessage(
    '?error=server_error&error_description=Redirect%20URL%20denied%20for%20private-user@example.com',
    '',
  );

  assert.match(message ?? '', /https:\/\/ronsmandarin\.com\//);
  assert.doesNotMatch(message ?? '', /private-user@example\.com/);
});

test('cancelled Google sign-in is explained without treating it as a server failure', () => {
  assert.equal(
    getOAuthCallbackErrorMessage('?error=access_denied', ''),
    'Google sign-in was cancelled. Try again when you’re ready.',
  );
});

test('disabled Google provider points to Supabase provider settings', () => {
  assert.match(
    getOAuthLoginErrorMessage(new Error('Unsupported provider: google')),
    /Authentication → Sign In \/ Providers/,
  );
});

test('missing Supabase client settings name the build variables to check', () => {
  const message = getOAuthLoginErrorMessage(new Error('Supabase is not configured for this local environment.'));

  assert.match(message, /VITE_SUPABASE_URL/);
  assert.match(message, /VITE_SUPABASE_ANON_KEY/);
});

test('unknown OAuth errors do not leak provider details to the sign-in screen', () => {
  const message = getOAuthLoginErrorMessage(new Error('internal response with user@example.com'));

  assert.equal(message, 'Google sign-in could not start. Please try again.');
  assert.doesNotMatch(message, /user@example\.com/);
});
