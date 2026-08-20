import { test as base, expect } from '@playwright/test';
import { createSettledPaymentMethod } from './utils/apiHelpers';
import { validCardPayload } from './utils/testData';
import type { PaymentMethod } from './utils/types';

type Fixtures = {
  /** A card payment method that has already settled into status "active". */
  activeCardPaymentMethod: PaymentMethod;
};

export const test = base.extend<Fixtures>({
  activeCardPaymentMethod: async ({ request }, use) => {
    const paymentMethod = await createSettledPaymentMethod(request, validCardPayload());
    await use(paymentMethod);
  },
});

export { expect };
