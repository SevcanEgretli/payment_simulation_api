import { test, expect } from '@fixtures';
import { expectProcessingResource } from '@utils/apiHelpers';


test.describe('Cancel payment', () => {
  test('cancel a payment which in processing', async ({
    request,
    activeCardPaymentMethod,
  }) => {
    const response = await request.post('/payments', {
      data: { payment_method_id: activeCardPaymentMethod.id, amount: 1000, currency: 'EUR' },
    });
    
    const paymentId = (await response.json()).id;
    const CancelResponse = await request.post(`/payments/${paymentId}/cancel`);
    const body = await CancelResponse.json();
    expect(CancelResponse.status()).toBe(200);
    expect(body.status).toBe('canceled');
    expect(body.payment_method_id).toBe(activeCardPaymentMethod.id);
    expect(body.amount).toBe(1000);
    expect(body.currency).toBe('EUR');

  });

});
