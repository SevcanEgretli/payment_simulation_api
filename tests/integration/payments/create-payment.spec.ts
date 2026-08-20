import { test, expect } from '@fixtures';
import { createSettledPaymentMethod, expectProcessingResource } from '@utils/apiHelpers';
import { validCardPayload, validSepaPayload, DECLINE_CARD_NUMBER, DECLINE_IBAN } from '@utils/testData';
import type { ApiError } from '@utils/types';


test.describe('Create payment', () => {
  test('accepts a valid payment against a card payment method and returns a processing resource', async ({
    request,
    activeCardPaymentMethod,
  }) => {
    const response = await request.post('/payments', {
      data: { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'EUR' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expectProcessingResource(body, 'pay_');
  });

  test('accepts a valid payment against a sepa payment method and returns a processing resource', async ({ request }) => {
    const sepaPaymentMethod = await createSettledPaymentMethod(request, validSepaPayload());

    const response = await request.post('/payments', {
      data: { payment_method_id: sepaPaymentMethod.id, amount: 1000, currency: 'EUR' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expectProcessingResource(body, 'pay_');
  });

  // A declined card/IBAN only fails once the payment settles
  test('accepts a payment against a declined card and returns a processing resource', async ({ request }) => {
    const declinedCardPaymentMethod = await createSettledPaymentMethod(
      request,
      validCardPayload({ number: DECLINE_CARD_NUMBER })
    );

    const response = await request.post('/payments', {
      data: { payment_method_id: declinedCardPaymentMethod.id, amount: 1000, currency: 'EUR' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expectProcessingResource(body, 'pay_');
  });

  test('accepts a payment against a declined IBAN and returns a processing resource', async ({ request }) => {
    const declinedSepaPaymentMethod = await createSettledPaymentMethod(request, validSepaPayload({ iban: DECLINE_IBAN }));

    const response = await request.post('/payments', {
      data: { payment_method_id: declinedSepaPaymentMethod.id, amount: 1000, currency: 'EUR' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expectProcessingResource(body, 'pay_');
  });

  test('accepts the minimum amount of 1 minor unit', async ({ request, activeCardPaymentMethod }) => {
    const response = await request.post('/payments', {
      data: { payment_method_id: activeCardPaymentMethod.id, amount: 1, currency: 'GBP' },
    });
    expect(response.status()).toBe(201);
  });

  test('rejects an unknown payment_method_id', async ({ request }) => {
    const response = await request.post('/payments', {
      data: { payment_method_id: 'pm_definitely_missing', amount: 1000, currency: 'EUR' },
    });

    expect(response.status()).toBe(422);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('unknown_payment_method');
  });

  const invalidAmountCases = [20.5, 0, -100, undefined];
  for (const amount of invalidAmountCases) {
    test(`rejects an invalid amount (${amount})`, async ({ request, activeCardPaymentMethod }) => {
      const response = await request.post('/payments', {
        data: { payment_method_id: activeCardPaymentMethod.id, amount, currency: 'EUR' },
      });

      expect(response.status()).toBe(422);
      const body: ApiError = await response.json();
      expect(body.error.code).toBe('invalid_amount');
    });
  }

  test('rejects an unsupported currency', async ({ request, activeCardPaymentMethod }) => {
    const response = await request.post('/payments', {
      data: { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'JPY' },
    });

    expect(response.status()).toBe(422);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('unsupported_currency');
  });
});
