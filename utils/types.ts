export interface ProcessingResource {
  id: string;
  status: 'processing';
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  type: 'adyen' | 'checkout' | 'sepa';
  status: 'active';
  created_at: string;
  card?: {
    brand: 'visa' | 'mastercard' | 'amex' | 'other';
    last4: string;
    exp_month: number;
    exp_year: number;
    holder_name: string;
  };
  sepa?: {
    holder_name: string;
    country: string;
    iban_last4: string;
  };
}

export interface Payment {
  id: string;
  payment_method_id: string;
  holder_name: string;
  amount: number;
  currency: 'EUR' | 'USD' | 'GBP';
  status: 'succeeded' | 'failed';
  failure_reason?: 'card_declined' | 'debit_declined';
  created_at: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

/** A table-driven "invalid input -> expected 422 code" test case. */
export interface ValidationCase {
  name: string;
  overrides: Partial<Record<string, unknown>>;
  expectedCode: string;
}
