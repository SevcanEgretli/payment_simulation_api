import { test, expect } from '@fixtures';
import { createSettledPaymentMethod } from '@utils/apiHelpers';
import { pollUntilSettled } from '@utils/pollUntil';
import { validCardPayload, validSepaPayload, cardBrandCases } from '@utils/testData';
import type { ApiError, PaymentMethod } from '@utils/types';

const visaCase = cardBrandCases.find((c) => c.brand === 'visa')!;

test.describe('Get payment method', () => {
  for (const type of ['adyen', 'checkout'] as const) {
    test(`returns full card data once a ${type} payment method settles to active`, async ({ request }) => {
      const payload = validCardPayload({ holder_name: visaCase.holderName, number: visaCase.number }, type);
      const createResponse = await request.post('/payment-methods', { data: payload });
      const created = await createResponse.json();

      const paymentMethod = await pollUntilSettled<PaymentMethod>(async () => {
        const res = await request.get(`/payment-methods/${created.id}`);
        return res.json();
      });

      expect(paymentMethod.id).toBe(created.id);
      expect(new Date(paymentMethod.created_at).toString()).not.toBe('Invalid Date');
      expect(paymentMethod.status).toBe('active');
      expect(paymentMethod.type).toBe(type);
      expect(paymentMethod.card).toMatchObject({
        brand: visaCase.brand,
        last4: payload.card.number.slice(-4),
        exp_month: payload.card.exp_month,
        holder_name: payload.card.holder_name,
      });
    });
  }

  for (const { brand, holderName, number, last4 } of cardBrandCases) {
    test(`detects brand "${brand}" from the card number`, async ({ request }) => {
      const paymentMethod = await createSettledPaymentMethod(
        request,
        validCardPayload({ holder_name: holderName, number })
      );

      expect(paymentMethod.card).toMatchObject({ brand, last4, holder_name: holderName });
    });
  }

  test('returns full sepa data once a sepa payment method settles to active', async ({ request }) => {
    const payload = validSepaPayload();
    const paymentMethod = await createSettledPaymentMethod(request, payload);

    expect(paymentMethod.status).toBe('active');
    expect(paymentMethod.type).toBe('sepa');
    expect(paymentMethod.sepa).toMatchObject({
      holder_name: payload.sepa.holder_name,
      iban_last4: payload.sepa.iban.slice(-4),
      country: payload.sepa.iban.slice(0, 2),
    });
  });

  test('never returns the full card number or CVC', async ({ request }) => {
    const payload = validCardPayload();
    const paymentMethod = await createSettledPaymentMethod(request, payload);

    const raw = JSON.stringify(paymentMethod);
    expect(raw).not.toContain(payload.card.number);
    expect(raw).not.toContain(payload.card.cvc);
  });

  test('never returns the full IBAN or BIC', async ({ request }) => {
    const payload = validSepaPayload();
    const paymentMethod = await createSettledPaymentMethod(request, payload);

    const raw = JSON.stringify(paymentMethod);
    expect(raw).not.toContain(payload.sepa.iban);
    expect(raw).not.toContain(payload.sepa.bic);
  });

  test('returns 404 for an unknown id', async ({ request }) => {
    const response = await request.get('/payment-methods/pm_definitely_missing');

    expect(response.status()).toBe(404);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('not_found');
  });

  test('returns the minimal processing shape before settling', async ({ request }) => {
    const createResponse = await request.post('/payment-methods', { data: validCardPayload() });
    const created = await createResponse.json();

    const response = await request.get(`/payment-methods/${created.id}`);
    const body = await response.json();

    expect(response.status()).toBe(200);
    if (body.status === 'processing') {
      expect(body).not.toHaveProperty('card');
      expect(body).not.toHaveProperty('type');
    }
  });

  test('returns a stable id and shape across repeated reads', async ({ activeCardPaymentMethod, request }) => {
    const first = await (await request.get(`/payment-methods/${activeCardPaymentMethod.id}`)).json();
    const second = await (await request.get(`/payment-methods/${activeCardPaymentMethod.id}`)).json();

    expect(first.id).toBe(activeCardPaymentMethod.id);
    expect(second.id).toBe(activeCardPaymentMethod.id);
    expect(first).toEqual(second);
  });
});
