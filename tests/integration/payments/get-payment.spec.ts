import { test, expect } from '@fixtures';
import { createSettledPayment, createSettledPaymentMethod } from '@utils/apiHelpers';
import { validCardPayload, validSepaPayload, DECLINE_CARD_NUMBER, DECLINE_IBAN } from '@utils/testData';
import type { ApiError } from '@utils/types';

test.describe('Get payment', () => {
  test('returns full data once a card payment settles to succeeded', async ({ request, activeCardPaymentMethod }) => {
    const payment = await createSettledPayment(request, {
      payment_method_id: activeCardPaymentMethod.id,
      amount: 1000,
      currency: 'EUR',
    });

    expect(payment.status).toBe('succeeded');
    expect(payment.payment_method_id).toBe(activeCardPaymentMethod.id);
    expect(payment.amount).toBe(1000);
    expect(payment.currency).toBe('EUR');
    expect(payment.failure_reason).toBeUndefined();
  });

  test('returns full data once a sepa payment settles to succeeded', async ({ request }) => {
    const sepaPaymentMethod = await createSettledPaymentMethod(request, validSepaPayload());

    const payment = await createSettledPayment(request, {
      payment_method_id: sepaPaymentMethod.id,
      amount: 1000,
      currency: 'EUR',
    });

    expect(payment.status).toBe('succeeded');
    expect(payment.payment_method_id).toBe(sepaPaymentMethod.id);
    expect(payment.amount).toBe(1000);
    expect(payment.currency).toBe('EUR');
    expect(payment.failure_reason).toBeUndefined();
  });

  test('returns failed/card_declined for the documented decline card', async ({ request }) => {
    const paymentMethod = await createSettledPaymentMethod(
      request,
      validCardPayload({ number: DECLINE_CARD_NUMBER })
    );

    const payment = await createSettledPayment(request, {
      payment_method_id: paymentMethod.id,
      amount: 500,
      currency: 'USD',
    });

    expect(payment.status).toBe('failed');
    expect(payment.failure_reason).toBe('card_declined');
  });

  test('returns failed/debit_declined for the documented decline IBAN', async ({ request }) => {
    const paymentMethod = await createSettledPaymentMethod(request, validSepaPayload({ iban: DECLINE_IBAN }));

    const payment = await createSettledPayment(request, {
      payment_method_id: paymentMethod.id,
      amount: 500,
      currency: 'EUR',
    });

    expect(payment.status).toBe('failed');
    expect(payment.failure_reason).toBe('debit_declined');
  });

  test('returns 404 for an unknown id', async ({ request }) => {
    const response = await request.get('/payments/pay_definitely_missing');

    expect(response.status()).toBe(404);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('not_found');
  });

  test('returns the minimal processing shape before settling', async ({ request, activeCardPaymentMethod }) => {
    const createResponse = await request.post('/payments', {
      data: { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'EUR' },
    });
    const created = await createResponse.json();

    const response = await request.get(`/payments/${created.id}`);
    const body = await response.json();

    expect(response.status()).toBe(200);
    if (body.status === 'processing') {
      expect(body).not.toHaveProperty('amount');
      expect(body).not.toHaveProperty('currency');
    }
  });
});
