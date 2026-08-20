import { test, expect } from '@playwright/test';
import { expectProcessingResource } from '@utils/apiHelpers';
import { validCardPayload, generateLuhnCardNumber, VALID_IBAN } from '@utils/testData';
import type { ApiError, ValidationCase } from '@utils/types';

// POST-only: asserts status code + the immediate "processing" shape.
// Settled "active" data is a GET concern - see get-payment-method.spec.ts.
test.describe('Create card payment method', () => {
  for (const type of ['adyen', 'checkout'] as const) {
    test(`accepts a valid ${type} card and returns a processing resource`, async ({ request }) => {
      const response = await request.post('/payment-methods', {
        data: validCardPayload({}, type),
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expectProcessingResource(body, 'pm_');
    });
  }

  test('accepts a 12-digit Luhn-valid card number (min length boundary)', async ({ request }) => {
    const number = generateLuhnCardNumber(12);
    const response = await request.post('/payment-methods', {
      data: validCardPayload({ number }),
    });
    expect(response.status()).toBe(201);
  });

  test('accepts a 19-digit Luhn-valid card number (max length boundary)', async ({ request }) => {
    const number = generateLuhnCardNumber(19);
    const response = await request.post('/payment-methods', {
      data: validCardPayload({ number }),
    });
    expect(response.status()).toBe(201);
  });

  test('accepts exp_month at its boundaries (1 and 12)', async ({ request }) => {
    for (const exp_month of [1, 12]) {
      const response = await request.post('/payment-methods', {
        data: validCardPayload({ exp_month }),
      });
      expect(response.status()).toBe(201);
    }
  });

  test('accepts a valid CVC of 3 or 4 digits', async ({ request }) => {
    for (const cvc of ['123', '1234']) {
      const response = await request.post('/payment-methods', {
        data: validCardPayload({ cvc }),
      });
      expect(response.status()).toBe(201);
    }
  });

  const validationCases: ValidationCase[] = [
    {
      name: 'rejects a Luhn-invalid card number',
      overrides: { number: '1234567890123456' },
      expectedCode: 'invalid_card_number',
    },
    {
      name: 'rejects a too-short card number (11 digits)',
      overrides: { number: generateLuhnCardNumber(11) },
      expectedCode: 'invalid_card_number',
    },
    {
      name: 'rejects a too-long card number (20 digits)',
      overrides: { number: '1'.repeat(20) },
      expectedCode: 'invalid_card_number',
    },
    {
      name: 'rejects an expired card',
      overrides: { exp_month: 1, exp_year: 2020 },
      expectedCode: 'card_expired',
    },
    {
      name: 'rejects a too-short CVC',
      overrides: { cvc: '12' },
      expectedCode: 'invalid_cvc',
    },
    {
      name: 'rejects an empty holder_name',
      overrides: { holder_name: '' },
      expectedCode: 'invalid_holder_name',
    },
  ];

  for (const { name, overrides, expectedCode } of validationCases) {
    test(name, async ({ request }) => {
      const response = await request.post('/payment-methods', {
        data: validCardPayload(overrides),
      });

      expect(response.status()).toBe(422);
      const body: ApiError = await response.json();
      expect(body.error.code).toBe(expectedCode);
    });
  }

  test('rejects type "adyen" combined with a sepa block (schema_mismatch)', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      data: { type: 'adyen', sepa: { holder_name: 'X', iban: VALID_IBAN } },
    });

    expect(response.status()).toBe(422);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('schema_mismatch');
  });
});
