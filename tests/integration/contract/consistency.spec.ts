import { test, expect } from '@fixtures';
import { pollUntilSettled } from '@utils/pollUntil';
import type { Payment } from '@utils/types';

// Documents 2 known API bugs. test.fail() keeps the suite green while
// they're open, but flips to failing the moment either gets fixed.
test.describe('Contract: payment resource consistency', () => {
  test.fail(
    'BUG: GET /payment-methods/{id}/payments returns a stable id for the same payment across repeated calls',
    async ({ activeCardPaymentMethod, request }) => {
      const createResponse = await request.post('/payments', {
        data: { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'EUR' },
      });
      const created = await createResponse.json();
      await pollUntilSettled<Payment>(async () => (await request.get(`/payments/${created.id}`)).json());

      const listResponse = await request.get(`/payment-methods/${activeCardPaymentMethod.id}/payments`);
      const [listedPayment] = (await listResponse.json()).data;

      const listResponseAgain = await request.get(`/payment-methods/${activeCardPaymentMethod.id}/payments`);
      const [listedPaymentAgain] = (await listResponseAgain.json()).data;

      // Observed: each call returns a different random id for the same
      // underlying payment.
      expect(listedPayment.id).toBe(created.id);
      expect(listedPaymentAgain.id).toBe(created.id);
    }
  );

  test.fail(
    'BUG: GET /payments/{id} returns the holder_name unmodified',
    async ({ activeCardPaymentMethod, request }) => {
      const createResponse = await request.post('/payments', {
        data: { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'EUR' },
      });
      const created = await createResponse.json();

      const payment = await pollUntilSettled<Payment>(async () => (await request.get(`/payments/${created.id}`)).json());

      const listResponse = await request.get(`/payment-methods/${activeCardPaymentMethod.id}/payments`);
      const [listedPayment] = (await listResponse.json()).data;

      // Observed: GET /payments/{id} truncates the last character of
      // holder_name (e.g. "Jane Doe" -> "Jane Do"), while the list endpoint
      // returns it correctly for the same payment.
      expect(payment.holder_name).toBe(listedPayment.holder_name);
    }
  );
});
