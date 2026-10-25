import { authService } from './authService';

/** A stable id makes retrying a timed-out submission safe. */
export async function sendFeedback(input: { id: string; message: string; path: string }): Promise<void> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error('Sign in to send feedback.');
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Please wait a little before sending more feedback.');
    if (response.status === 401) throw new Error('Sign in again to send feedback.');
    throw new Error('Could not send. Your message is still here—please try again.');
  }
}
