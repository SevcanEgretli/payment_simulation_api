// Test values documented by the API to always decline.
export const DECLINE_CARD_NUMBER = '4000000000000002';
export const DECLINE_IBAN = 'DE62370400440532013001';

export const VALID_IBAN = 'DE89370400440532013000';
export const VALID_BIC = 'COBADEFFXXX';


export const VISA_CARD_NUMBER = '4111111111111111';
export const MASTERCARD_CARD_NUMBER = '5555555555554444';

export const cardBrandCases: Array<{ brand: string; holderName: string; number: string; last4: string }> = [
  { brand: 'visa', holderName: 'Jane Doe', number: VISA_CARD_NUMBER, last4: '1111' },
  { brand: 'mastercard', holderName: 'Jack Doe', number: MASTERCARD_CARD_NUMBER, last4: '4444' },
];

const luhnCheckDigit = (numberWithoutCheckDigit: string): number => {
  const sum = numberWithoutCheckDigit
    .split('')
    .reverse()
    .map(Number)
    .reduce((total, digit, index) => {
      let value = digit;
      if (index % 2 === 0) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      return total + value;
    }, 0);
  return (10 - (sum % 10)) % 10;
};


export const generateLuhnCardNumber = (length: number, prefix = '4'): string => {
  let body = prefix;
  while (body.length < length - 1) {
    body += Math.floor(Math.random() * 10).toString();
  }
  body = body.slice(0, length - 1);
  return `${body}${luhnCheckDigit(body)}`;
};

export const validCardPayload = (
  cardOverrides: Partial<Record<string, unknown>> = {},
  type: 'adyen' | 'checkout' = 'adyen'
) => ({
  type,
  card: {
    holder_name: 'Jane Doe',
    number: VISA_CARD_NUMBER,
    exp_month: 12,
    exp_year: new Date().getFullYear() + 3,
    cvc: '123',
    ...cardOverrides,
  },
});

export const validSepaPayload = (overrides: Partial<Record<string, unknown>> = {}) => ({
  type: 'sepa',
  sepa: {
    holder_name: 'Jane Doe',
    iban: VALID_IBAN,
    bic: VALID_BIC,
    ...overrides,
  },
});
