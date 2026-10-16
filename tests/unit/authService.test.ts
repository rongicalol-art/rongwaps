import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOAuthCallbackErrorMessage,
  getOAuthLoginErrorMessage,
  getOAuthRedirectUrl,
} from '../../src/services/authService';

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
