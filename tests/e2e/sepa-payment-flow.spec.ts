import { test, expect } from '@fixtures';
import { createSettledPaymentMethod, createSettledPayment } from '@utils/apiHelpers';
import { validSepaPayload } from '@utils/testData';

test('a customer pays via SEPA direct debit, and the payment shows up in their history', async ({ request }) => {

  const paymentMethod = await createSettledPaymentMethod(request, validSepaPayload());
  expect(paymentMethod.status).toBe('active');

  const payment = await createSettledPayment(request, {
    payment_method_id: paymentMethod.id,
    amount: 5000,
    currency: 'EUR',
  });
  expect(payment.status).toBe('succeeded');

  const historyResponse = await request.get(`/payment-methods/${paymentMethod.id}/payments`);
  const history = (await historyResponse.json()).data;
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ amount: 5000, currency: 'EUR', status: 'succeeded' });
});
