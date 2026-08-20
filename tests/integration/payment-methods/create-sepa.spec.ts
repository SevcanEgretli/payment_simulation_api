import { test, expect } from '@playwright/test';
import { expectProcessingResource } from '@utils/apiHelpers';
import { validCardPayload, validSepaPayload, VALID_IBAN } from '@utils/testData';
import type { ApiError, ValidationCase } from '@utils/types';

// POST-only: asserts what POST /payment-methods returns. Settled "active"
// data is a GET concern - see get-payment-method.spec.ts.
test.describe('Create SEPA payment method', () => {
  test('accepts a valid sepa payload and returns a processing resource', async ({ request }) => {
    const response = await request.post('/payment-methods', { data: validSepaPayload() });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expectProcessingResource(body, 'pm_');
  });

  test('bic is optional', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      data: validSepaPayload({ bic: undefined }),
    });
    expect(response.status()).toBe(201);
  });

  test('accepts an iban containing spaces, per the documented format', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      data: validSepaPayload({ iban: 'DE89 3704 0044 0532 0130 00' }),
    });
    expect(response.status()).toBe(201);
  });

  const otherCountryIbans: Array<{ country: string; iban: string }> = [
    { country: 'Netherlands', iban: 'NL91ABNA0417164300' },
    { country: 'Spain', iban: 'ES9121000418450200051332' },
  ];

  for (const { country, iban } of otherCountryIbans) {
    test(`accepts a checksum-valid ${country} IBAN`, async ({ request }) => {
      const response = await request.post('/payment-methods', {
        data: validSepaPayload({ iban }),
      });
      expect(response.status()).toBe(201);
    });
  }

  test('never echoes the iban back in the response', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      data: validSepaPayload({ iban: VALID_IBAN }),
    });

    const raw = JSON.stringify(await response.json());
    expect(raw).not.toContain(VALID_IBAN);
  });

  const validationCases: ValidationCase[] = [
    {
      name: 'rejects a checksum-invalid IBAN',
      overrides: { iban: 'DE00000000000000000000' },
      expectedCode: 'invalid_iban',
    },
    {
      name: 'rejects a BIC of the wrong length',
      overrides: { bic: 'SHORT' },
      expectedCode: 'invalid_bic',
    },
    {
      name: 'rejects an empty BIC',
      overrides: { bic: '' },
      expectedCode: 'invalid_bic',
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
        data: validSepaPayload(overrides),
      });

      expect(response.status()).toBe(422);
      const body: ApiError = await response.json();
      expect(body.error.code).toBe(expectedCode);
    });
  }

  test('rejects type "sepa" combined with a card block (schema_mismatch)', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      data: { type: 'sepa', card: validCardPayload().card },
    });

    expect(response.status()).toBe(422);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('schema_mismatch');
  });
});
