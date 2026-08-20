import { test, expect } from '@fixtures';
import { createSettledPaymentMethod, createSettledPayment } from '@utils/apiHelpers';
import { validCardPayload } from '@utils/testData';

test('a customer adds a card, gets charged, and the payment shows up in their history', async ({ request }) => {
  const paymentMethod = await createSettledPaymentMethod(request, validCardPayload());
  expect(paymentMethod.status).toBe('active');

  const payment = await createSettledPayment(request, {
    payment_method_id: paymentMethod.id,
    amount: 2500,
    currency: 'EUR',
  });
  expect(payment.status).toBe('succeeded');

  // 3. The payment appears in that payment method's history.
  const historyResponse = await request.get(`/payment-methods/${paymentMethod.id}/payments`);
  const history = (await historyResponse.json()).data;
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ amount: 2500, currency: 'EUR', status: 'succeeded' });
});
