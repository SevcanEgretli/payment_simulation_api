import { test, expect } from '@fixtures';
import { createSettledPaymentMethod } from '@utils/apiHelpers';
import { pollUntilSettled } from '@utils/pollUntil';
import { validCardPayload, DECLINE_CARD_NUMBER, VALID_IBAN } from '@utils/testData';
import type { PaymentMethod, Payment } from '@utils/types';

// The API accepts unknown request fields instead of rejecting them. That's
// fine, as long as they can't change what the server actually does - which
// is what these tests check, comparing POST and GET like consistency.spec.ts.
test.describe('Contract: unexpected request fields', () => {
  test('ignores an unrecognized top-level property and does not let it leak into the resource', async ({ request }) => {
    const payload = validCardPayload();
    const response = await request.post('/payment-methods', {
      data: {
        ...payload,
        // A second, invalid "card" look-alike block under a made-up key.
        card2: { holder_name: 'invaliiid', number: DECLINE_CARD_NUMBER, exp_month: 1, exp_year: 2029, cvc: '012' },
      },
    });
    expect(response.status()).toBe(201);
    const created = await response.json();

    const paymentMethod = await pollUntilSettled<PaymentMethod>(async () => {
      const res = await request.get(`/payment-methods/${created.id}`);
      return res.json();
    });

    expect(paymentMethod.card?.holder_name).toBe(payload.card.holder_name); // the real "card" block, not "card2"
    const raw = JSON.stringify(paymentMethod);
    expect(raw).not.toContain('invaliiid');
    expect(raw).not.toContain('card2');
  });

  test('does not let a client-supplied country override the IBAN-derived one', async ({ request }) => {
    const response = await request.post('/payment-methods', {
      data: {
        type: 'sepa',
        sepa: {
          holder_name: 'Country Override Test',
          iban: VALID_IBAN, 
          country: 'FR', 
        },
      },
    });
    expect(response.status()).toBe(201);
    const created = await response.json();

    const paymentMethod = await pollUntilSettled<PaymentMethod>(async () => {
      const res = await request.get(`/payment-methods/${created.id}`);
      return res.json();
    });

    expect(paymentMethod.sepa?.country).toBe(VALID_IBAN.slice(0, 2));
  });

  test('does not let a client-supplied status/failure_reason override the real outcome', async ({ request }) => {
    const declinedPaymentMethod = await createSettledPaymentMethod(
      request,
      validCardPayload({ number: DECLINE_CARD_NUMBER })
    );

    const response = await request.post('/payments', {
      data: {
        payment_method_id: declinedPaymentMethod.id,
        amount: 1000,
        currency: 'EUR',
        status: 'succeeded', // client tries to force a successful outcome
        failure_reason: null,
      },
    });
    expect(response.status()).toBe(201);
    const created = await response.json();

    const payment = await pollUntilSettled<Payment>(async () => {
      const res = await request.get(`/payments/${created.id}`);
      return res.json();
    });

    expect(payment.status).toBe('failed');
    expect(payment.failure_reason).toBe('card_declined');
  });
});
