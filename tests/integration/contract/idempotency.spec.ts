import { test, expect } from '@fixtures';

// Known design gap (see README "Design Observations"): no idempotency
// support, so a retried payment payload double-charges. test.fail() keeps
// the suite green until that's fixed, then flips to failing as the signal.
test.describe('Contract: payment idempotency', () => {
  test.fail(
    'DESIGN GAP: sending an identical payment payload twice does not create a duplicate charge',
    async ({ activeCardPaymentMethod, request }) => {
      const payload = { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'EUR' };

      const [firstResponse, secondResponse] = await Promise.all([
        request.post('/payments', { data: payload }),
        request.post('/payments', { data: payload }),
      ]);
      const first = await firstResponse.json();
      const second = await secondResponse.json();

      // Observed: no idempotency key support - the exact same payload
      // creates two separate payments with two separate ids.
      expect(second.id).toBe(first.id);
    }
  );
});
