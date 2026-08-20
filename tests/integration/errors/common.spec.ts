import { test, expect } from '@playwright/test';
import { baseURL, apiKey } from '@config/env';
import { validCardPayload } from '@utils/testData';
import type { ApiError } from '@utils/types';

test.describe('Common error handling', () => {
  test('rejects malformed JSON bodies with invalid_json', async () => {
    // Native fetch: APIRequestContext's `data` string handling re-encodes
    // the body instead of sending it as-is, masking real malformed JSON.
    const response = await fetch(`${baseURL}/payment-methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: '{"type":"adyen", not valid json',
    });

    expect(response.status).toBe(400);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('invalid_json');
  });

  test('rejects non-JSON content types with unsupported_media_type', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      headers: { 'Content-Type': 'text/plain' },
      data: JSON.stringify(validCardPayload()),
    });

    expect(response.status()).toBe(415);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('unsupported_media_type');
  });

  test('returns not_found for an unknown payment-methods path', async ({ request }) => {
    const response = await request.get('/payment-methods/nope');
    expect(response.status()).toBe(404);
  });

  test('returns not_found for an unknown payments path', async ({ request }) => {
    const response = await request.get('/payments/nope');
    expect(response.status()).toBe(404);
  });
});

