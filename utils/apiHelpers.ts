import { APIRequestContext, expect } from '@playwright/test';
import { pollUntilSettled } from './pollUntil';
import type { PaymentMethod, Payment, ProcessingResource } from './types';

/** Arrange-only helper: POSTs a payment method and polls until it settles. */
export const createSettledPaymentMethod = async (
  request: APIRequestContext,
  payload: object
): Promise<PaymentMethod> => {
  const createResponse = await request.post('/payment-methods', { data: payload });
  const created = await createResponse.json();

  return pollUntilSettled<PaymentMethod>(async () => {
    const res = await request.get(`/payment-methods/${created.id}`);
    return res.json();
  });
};

/** Arrange-only helper: POSTs a payment and polls until it settles. */
export const createSettledPayment = async (
  request: APIRequestContext,
  payload: object
): Promise<Payment> => {
  const createResponse = await request.post('/payments', { data: payload });
  const created = await createResponse.json();

  return pollUntilSettled<Payment>(async () => {
    const res = await request.get(`/payments/${created.id}`);
    return res.json();
  });
};

/** Asserts a freshly-created resource has the documented ProcessingResource shape. */
export const expectProcessingResource = (body: ProcessingResource, idPrefix: string) => {
  expect(body.status).toBe('processing');
  expect(body.id.startsWith(idPrefix)).toBe(true);
  expect(new Date(body.created_at).toString()).not.toBe('Invalid Date');
};
