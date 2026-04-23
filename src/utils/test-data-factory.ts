/**
 * TestDataFactory — Generates isolated, repeatable test data.
 * Use a unique suffix per run to prevent data collisions in parallel tests.
 */
export class TestDataFactory {
  private static runId = Date.now().toString(36).toUpperCase();

  static unique(prefix: string): string {
    return `${prefix}_${this.runId}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  static user(overrides: Partial<UserData> = {}): UserData {
    const id = this.unique('USER');
    return {
      firstName: 'Test',
      lastName: 'Automation',
      email: `${id.toLowerCase()}@test.qa`,
      password: 'Secure@Test123!',
      phone: '+91-9876543210',
      ...overrides,
    };
  }

  static address(overrides: Partial<AddressData> = {}): AddressData {
    return {
      street: '42 Automated Lane',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      ...overrides,
    };
  }

  static product(overrides: Partial<ProductData> = {}): ProductData {
    const id = this.unique('PROD');
    return {
      name: `Test Product ${id}`,
      description: 'Auto-generated test product',
      price: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
      sku: id,
      category: 'test',
      ...overrides,
    };
  }

  static creditCard() {
    return {
      number: '4111111111111111', // Stripe test card
      expiry: '12/28',
      cvv: '123',
      name: 'Test Automation',
    };
  }

  /**
   * Generates a date string N days from now.
   */
  static futureDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomItem<T>(arr: T[]): T {
    return arr[this.randomInt(0, arr.length - 1)];
  }
}

// ── Type Definitions ─────────────────────────────────────────────

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface AddressData {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface ProductData {
  name: string;
  description: string;
  price: number;
  sku: string;
  category: string;
}
