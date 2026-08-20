import { test, expect } from '@fixtures';
import { createSettledPayment } from '@utils/apiHelpers';
import type { ApiError } from '@utils/types';

test.describe('List payments for a payment method', () => {
  test('returns an empty list for a payment method with no payments', async ({ activeCardPaymentMethod, request }) => {
    const response = await request.get(`/payment-methods/${activeCardPaymentMethod.id}/payments`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  test('returns 404 for an unknown payment method id', async ({ request }) => {
    const response = await request.get('/payment-methods/pm_definitely_missing/payments');

    expect(response.status()).toBe(404);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('not_found');
  });

  test('lists payments oldest first', async ({ activeCardPaymentMethod, request }) => {
    await createSettledPayment(request, {
      payment_method_id: activeCardPaymentMethod.id,
      amount: 100,
      currency: 'EUR',
    });
    await createSettledPayment(request, {
      payment_method_id: activeCardPaymentMethod.id,
      amount: 200,
      currency: 'EUR',
    });

    const listResponse = await request.get(`/payment-methods/${activeCardPaymentMethod.id}/payments`);
    const body = await listResponse.json();

    expect(body.data).toHaveLength(2);
    const [listedFirst, listedSecond] = body.data;
    expect(new Date(listedFirst.created_at).getTime()).toBeLessThanOrEqual(
      new Date(listedSecond.created_at).getTime()
    );
    expect(listedFirst.amount).toBe(100);
    expect(listedSecond.amount).toBe(200);
  });
});
