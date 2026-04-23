# 🎯 Playwright Resilient Automation Agent
> Enterprise-grade UI + API Automation Framework | TypeScript + Playwright

---

## 🏗️ Architecture Overview

```
playwright-agent/
├── .github/
│   └── workflows/
│       └── playwright.yml          # CI/CD: parallel sharded runs, merge reports
│
├── src/
│   ├── core/
│   │   ├── BasePage.ts             ⭐ Self-healing locators, smart waits, retry
│   │   └── BaseApiClient.ts        ⭐ Retry + backoff, schema validation, logging
│   │
│   ├── pages/                      # Page Object Models (extend BasePage)
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   │
│   ├── api/                        # API service clients (extend BaseApiClient)
│   │   └── users.api.ts            # Zod-validated typed API methods
│   │
│   ├── fixtures/
│   │   └── index.ts                # Custom test fixtures (basePage, apiClient, factory)
│   │
│   ├── utils/
│   │   ├── retry.ts                ⭐ retry(), poll() with exponential backoff
│   │   ├── logger.ts               # Winston logger (console + file)
│   │   ├── test-data-factory.ts    # Unique test data generation
│   │   ├── network-interceptor.ts  ⭐ Mock, spy, block network from UI tests
│   │   └── visual-helper.ts        # Visual regression snapshots
│   │
│   └── config/
│       ├── global-setup.ts         # Auth state caching before all tests
│       └── global-teardown.ts      # Cleanup after all tests
│
├── tests/
│   ├── auth.setup.ts               # Playwright auth setup project
│   ├── ui/
│   │   └── login.spec.ts           # UI tests using Page Objects
│   ├── api/
│   │   └── users.spec.ts           # API tests with schema validation
│   └── hybrid/
│       └── users-hybrid.spec.ts    # API setup → UI verification pattern
│
├── playwright.config.ts            # Multi-project, parallel, retry config
├── tsconfig.json
├── .env.dev / .env.staging
└── package.json
```

---

## ⚡ Resilience Features

### 1. Self-Healing Locators
Every locator uses a priority-ordered fallback chain:
```
data-testid → aria-label → role+name → placeholder → text → css
```
If the primary selector breaks (e.g. class rename), the next strategy is tried automatically.

```typescript
// BasePage.selfHeal() — survives UI refactors
get loginButton() {
  return this.selfHeal({
    testId: 'login-button',   // 1st: most stable
    role: 'button',
    roleName: 'Login',        // 2nd: ARIA
    css: 'button[type=submit]' // 3rd: fallback
  });
}
```

### 2. Retry with Exponential Backoff
```typescript
// Retry flaky actions automatically
await retry(() => locator.click(), { retries: 3, delay: 500, exponential: true });

// Poll async conditions
await poll(() => getOrderStatus() === 'CONFIRMED', { timeout: 30_000, interval: 1_000 });
```

### 3. Automatic Test Retries
```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 1,  // 2 retries on CI, 1 locally
```

### 4. Smart Dynamic Waits
```typescript
await basePage.waitForLoader();           // waits for spinners to vanish
await basePage.waitForPageStable();       // networkidle + domcontentloaded
await basePage.waitForVisible(locator);   // explicit visibility wait
```

### 5. Parallel Execution
```typescript
fullyParallel: true,
workers: process.env.CI ? 4 : 2,
// CI workflow also shards across 4 machines per browser
```

---

## 🚀 Quick Start

```bash
# 1. Clone and install
npm install

# 2. Install browsers
npx playwright install --with-deps

# 3. Configure environment
cp .env.dev .env.local
# edit BASE_URL, API_BASE_URL, credentials

# 4. Run all tests
npm test

# 5. Run smoke tests only
npm run test:smoke

# 6. Run headed (watch the browser)
npm run test:headed

# 7. Debug a specific test
npm run test:debug -- tests/ui/login.spec.ts

# 8. View HTML report
npm run test:report
```

---

## 🌍 Environment Switching

```bash
# Dev
ENV=dev npm test

# Staging
ENV=staging npm test

# Production (smoke only!)
ENV=prod npm run test:smoke
```

---

## 🖊️ Writing a New Page Object

```typescript
import { Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class ProductPage extends BasePage {
  constructor(page: Page) { super(page); }

  // Self-healing locators
  get addToCartButton() {
    return this.selfHeal({
      testId: 'add-to-cart',
      role: 'button', roleName: 'Add to Cart',
      css: '.btn-cart'
    });
  }

  // Action methods
  async addToCart() {
    await this.click(this.addToCartButton);
    await this.waitForVisible(this.page.getByText('Added to cart'));
  }
}
```

---

## 🌐 Writing a New API Service

```typescript
import { z } from 'zod';
import { BaseApiClient } from '../core/BaseApiClient';

const OrderSchema = z.object({
  id: z.string(),
  total: z.number(),
  status: z.enum(['pending', 'confirmed', 'shipped']),
});

export class OrdersApi extends BaseApiClient {
  async createOrder(data: unknown) {
    const res = await this.post('/orders', data);
    this.assertStatus(res, 201);
    return this.validateSchema(res, OrderSchema);  // typed + validated
  }
}
```

---

## 🔗 Hybrid Test Pattern (API + UI)

```typescript
test('order created via API appears in UI', async ({ page, request }) => {
  // FAST: Create state via API
  const api = new OrdersApi(request);
  const order = await api.createOrder({ ... });

  // RELIABLE: Verify only the UI rendering
  await page.goto('/orders');
  await expect(page.getByText(order.id)).toBeVisible();
});
```

---

## 🔀 CI/CD Pipeline

| Job | Description |
|-----|-------------|
| `quality` | TypeScript typecheck + ESLint |
| `api-tests` | All API specs in isolation |
| `ui-tests` | Matrix: 3 browsers × 4 shards = 12 parallel runners |
| `merge-reports` | Merges blob reports → single HTML report |
| `notify` | Slack alert on failure |

Triggered on: push, PR, nightly schedule, manual dispatch.

---

## 📋 Tagging Strategy

| Tag | Usage |
|-----|-------|
| `@smoke` | Critical path — runs on every PR |
| `@regression` | Full suite — runs nightly |
| `@slow` | Long-running — excluded from PR runs |
| `@flaky` | Known flaky — isolated and monitored |

```bash
npx playwright test --grep @smoke
npx playwright test --grep-invert @flaky
```

---

## 📊 Reporting

- **HTML Report** — `playwright-report/index.html` (auto-published to GitHub Pages on `main`)
- **JSON Report** — `test-results/results.json` (CI metrics ingestion)
- **Logs** — `test-results/logs/test-run.log`
- **Screenshots** — captured on failure automatically
- **Videos** — retained on failure automatically
- **Traces** — recorded on first retry (open with `npx playwright show-trace`)

---

## 🔧 Maintenance Tips

1. **Locator breaks?** Add a new strategy to `selfHeal()` — existing tests keep working.
2. **New environment?** Add `.env.prod`, update `ENV=prod` in CI secrets.
3. **Flaky test?** Tag `@flaky`, investigate trace file, increase retry count.
4. **Slow suite?** Increase `workers`, add more shards in CI matrix.
5. **API schema changes?** Update the Zod schema — TypeScript will catch all affected tests.
