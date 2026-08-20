import { test, expect } from '@fixtures';
import { createSettledPaymentMethod, createSettledPayment } from '@utils/apiHelpers';
import { validCardPayload, DECLINE_CARD_NUMBER } from '@utils/testData';

test('a payment with a declined card fails with a clear reason, visible in history', async ({ request }) => {
  const paymentMethod = await createSettledPaymentMethod(request, validCardPayload({ number: DECLINE_CARD_NUMBER }));
  expect(paymentMethod.status).toBe('active');

  const payment = await createSettledPayment(request, {
    payment_method_id: paymentMethod.id,
    amount: 1500,
    currency: 'USD',
  });
  expect(payment.status).toBe('failed');
  expect(payment.failure_reason).toBe('card_declined');

  const historyResponse = await request.get(`/payment-methods/${paymentMethod.id}/payments`);
  const history = (await historyResponse.json()).data;
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ status: 'failed', failure_reason: 'card_declined' });
});
