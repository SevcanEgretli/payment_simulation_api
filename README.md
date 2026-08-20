# Payment Simulator API Tests

Automated test suite written with Playwright + TypeScript for the [Distribusion Payment Simulation API](https://qa-interview-service.fly.dev/docs) (creating card & SEPA payment methods, initiating payments). Black-box API tests only.

## Project Structure

```
api_payment/
├── .github/workflows/api-tests.yml   # CI workflow (push/manual/daily)
├── config/
│   └── env.ts                        # reads base URL + API key from .env
├── fixtures.ts                       # shared Playwright fixtures (e.g. a ready, active payment method)
├── utils/
│   ├── apiClient.ts                  # generic get/post/put/patch/delete helpers
│   ├── apiHelpers.ts                 # "create + wait until settled" arrange helpers, plus expectProcessingResource
│   ├── pollUntil.ts                  # processing -> final status polling helper
│   ├── testData.ts                   # valid/invalid card & IBAN payload builders, Luhn number generator, brand test cases
│   └── types.ts                      # TS types for the API's schemas and shared test-case shapes
├── tests/
│   ├── e2e/                                   # a few tests, each covering one full business flow end-to-end
│   │   ├── card-payment-flow.spec.ts
│   │   ├── sepa-payment-flow.spec.ts
│   │   └── declined-payment-flow.spec.ts
│   └── integration/                           # many tests, each covering one endpoint/behaviour in isolation
│       ├── auth.spec.ts                          # 401 scenarios
│       ├── errors/common.spec.ts                 # cross-cutting errors: 400/404/415
│       ├── payment-methods/
│       │   ├── create-card.spec.ts               # POST ONLY: 201 + processing shape, validation, boundary values
│       │   ├── create-sepa.spec.ts               # POST ONLY: 201 + processing shape, validation
│       │   └── get-payment-method.spec.ts        # GET ONLY: active card/sepa/brand data, processing shape, 404, data leakage
│       ├── payments/
│       │   ├── create-payment.spec.ts            # POST ONLY: 201 + processing shape, validation
│       │   ├── get-payment.spec.ts                # GET ONLY: succeeded/failed (declined card & IBAN), processing shape, 404
│       │   └── list-payments.spec.ts              # GET ONLY (list): ordering, empty list, 404
│       ├── contract/
│       │   ├── consistency.spec.ts                # exception: deliberately compares POST + GET, see "Bugs Found" below
│       │   └── unexpected-fields.spec.ts           # exception: do undocumented/extra fields ever affect server output?
│       └── rate-limit/rate-limit.spec.ts          # opt-in only, see "Rate limiting" below
├── playwright.config.ts
├── package.json
└── tsconfig.json
```

**Two layers, on purpose.** `tests/integration/` is the bulk of the suite: many small, isolated tests, each pinned to one endpoint's behaviour. `tests/e2e/` is deliberately small: a handful of tests that each walk through one full, realistic flow (add a card → charge it → see it in history) in a single test, the way a real integrator would use the API. The two layers trade off differently on purpose - integration tests pinpoint exactly what broke; e2e tests give confidence that the pieces actually work together for a real scenario. Bugs found in either layer still get reported through `tests/integration/contract/`, since that's where cross-endpoint comparisons belong.

**Path aliases.** Every test imports shared code via `@fixtures`, `@utils/*` and `@config/*` (configured in `tsconfig.json`'s `paths`, natively resolved by Playwright) instead of relative paths like `../../../utils/testData`. This keeps imports stable regardless of how deeply a test file is nested.

## Setup

```bash
npm install
cp .env.example .env   # fill in your API_KEY
npx playwright test
npm run test:report    # open the latest HTML report
```

The API key is never hardcoded; `config/env.ts` reads it from `.env` and throws a clear error if it's missing. The Playwright config attaches it as the `X-Api-Key` header on every request automatically.

## Test Strategy

**POST and GET tests are isolated.** Each test is responsible for exactly one request's behaviour. `create-*.spec.ts` files verify ONLY the `{id, status:"processing"}` shape that `POST` returns immediately; a resource's final data once it settles (active card/sepa details, a succeeded/failed payment) is verified ONLY through the GET response, in `get-*.spec.ts` files. That way, when a test fails, the failure message alone tells you which endpoint broke - creation or retrieval. The one deliberate exception is `tests/integration/contract/consistency.spec.ts`: those tests exist specifically to compare two different endpoints' responses for the same resource, so combining POST and GET there is intentional. (`tests/e2e/` deliberately breaks this rule too, on purpose - see "Two layers, on purpose" above.)

**Async flow.** `POST /payment-methods` and `POST /payments` return `{id, status:"processing"}` immediately; the real outcome settles a few seconds later. Almost every GET test needs a "create it, then wait until it settles" setup, so that's centralized in `createSettledPaymentMethod` / `createSettledPayment` (in `utils/apiHelpers.ts`, built on `utils/pollUntil.ts`). `fixtures.ts` provides the most frequently needed case - a ready, active card payment method - as a reusable fixture. Every test that uses this fixture gets its own freshly created payment method (`test`-scoped, not shared), trading a bit of speed for full test isolation.

**Coverage:**
- **Main flows**: create a card (adyen/checkout) or sepa payment method → active; create a payment → succeeded, for both card- and sepa-backed payment methods; list payments
- **Card brand detection**: visa and mastercard test numbers are both verified to resolve to the correct `brand` in the settled resource
- **Boundary values**: card number length 12/19 digits, `exp_month` 1/12, CVC 3/4 digits, `amount` minimum of 1
- **Decline scenarios**: the documented test card (`4000000000000002` → `card_declined`) and IBAN (`DE62...3001` → `debit_declined`) - verified both that POST still accepts them (it can't know the outcome yet) and that GET eventually reports the correct failure
- **Validation errors (422)**: at least one test per documented per-field code (`invalid_card_number`, `card_expired`, `invalid_cvc`, `invalid_holder_name`, `schema_mismatch`, `invalid_iban`, `invalid_bic`, `unknown_payment_method`, `invalid_amount`, `unsupported_currency`), including the edge case of a required field being entirely omitted rather than just invalid
- **International IBANs**: checksum-valid IBANs from Germany, the Netherlands and Spain are all accepted; IBANs with spaces are accepted per the documented format
- **Common errors**: 401 (missing/invalid key), 404, 400 (malformed JSON), 415 (wrong content type)
- **Sensitive data leakage**: the full card number/CVC/IBAN/BIC must never appear in any response - verified by stringifying the whole response and searching it
- **Undocumented/extra fields**: no request schema declares `additionalProperties: false`, so the API doesn't reject unknown fields with a 422 (`tests/integration/contract/unexpected-fields.spec.ts`). We also verified this isn't dangerous: an extra `card2` block doesn't leak or get mixed in, a `country` value that contradicts the IBAN can't override the IBAN-derived one, and a `status`/`failure_reason` injected into `/payments` can't override the real (declined) outcome - so there's no mass-assignment vulnerability, just undocumented leniency

**Deliberately out of scope** (noted in `tests/integration/errors/common.spec.ts`):
- `413 payload_too_large`: constructing a large-enough payload adds little test-design value here

## Rate limiting

The docs mention a limit of 300 requests/minute per API key, returning `429` with a `Retry-After` header. `tests/integration/rate-limit/rate-limit.spec.ts` really triggers this (sends ~320 requests in concurrent batches) and checks the response. It's skipped by default (`test.skip` guarded by an env var) so the normal suite never eats into the shared key's budget; run it deliberately with `npm run test:rate-limit`. Avoid running it right before the rest of the suite - the key stays rate-limited for the remainder of that 60s window.

## Bugs Found

While building the suite I found **2 real, reproducible bugs** where the API's behaviour deviates from what it documents. Both are documented as `test.fail()` tests in `tests/integration/contract/consistency.spec.ts` - the suite stays green while the bugs are open, but the test will flip to "unexpectedly passed" (failing the run) the moment either is fixed, turning them into living regression tests rather than one-off bug reports.

1. **Unstable resource id**: `GET /payment-methods/{id}/payments` returns a **different `id` on every call** for the same payment (and neither matches the id `POST /payments` originally returned). This breaks the basic contract that a resource id should be stable.
2. **`holder_name` truncation**: `GET /payments/{id}` returns `holder_name` one character short of the original value (e.g. "Jane Doe" → "Jane Do"), while the same payment's `holder_name` comes back correct via `GET /payment-methods/{id}/payments`.

## Design Observations (not bugs, presentation notes)

These don't contradict the documentation - the API never promises otherwise - but they'd matter in a real payment system, so they're noted here instead of encoded as failing tests:

- **No idempotency**: sending the exact same payload to `/payments` twice creates two separate payments with two separate ids (verified live); no `Idempotency-Key`-style header is supported or documented. For `/payment-methods` this just means clutter in a saved-card list, but for `/payments` the real risk is a network timeout causing a client retry that results in the customer being charged **twice**. This is exactly what idempotency keys in production payment APIs (Stripe, Adyen, etc.) exist to prevent.

## Adding New Tests

First decide which layer it belongs in: a new endpoint, error code or edge case goes in `tests/integration/`; a new realistic multi-step business scenario goes in `tests/e2e/` (and should stay one of only a few - see "Two layers, on purpose" above).

Add a new `*.spec.ts` file under the relevant folder. Import shared code via the `@fixtures` / `@utils/*` / `@config/*` aliases, not relative paths. Use Playwright's `request` fixture (it already carries `baseURL` + `X-Api-Key` from the config); use the `activeCardPaymentMethod` fixture from `@fixtures` when you need a ready-made active payment method, or `createSettledPaymentMethod` / `createSettledPayment` from `@utils/apiHelpers` when you need a different type (sepa, a declined card, a specific brand, etc.); use `expectProcessingResource(body, idPrefix)` to assert the immediate POST shape; and reuse `ValidationCase` from `@utils/types` for table-driven 422 tests.
