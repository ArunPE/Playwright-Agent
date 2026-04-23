import { Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get cartItems() {
    return this.page.locator('.cart_item');
  }

  get checkoutButton() {
    return this.selfHeal({
      css: '[data-test="checkout"]',
      role: 'button', roleName: 'Checkout',
    });
  }

  get continueShoppingButton() {
    return this.selfHeal({ css: '[data-test="continue-shopping"]' });
  }

  cartItemByName(name: string) {
    return this.page.locator('.cart_item').filter({ hasText: name });
  }

  removeButtonFor(name: string) {
    return this.cartItemByName(name).locator('button');
  }

  async goto() {
    await this.navigate('/cart.html');
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async removeItem(name: string) {
    await this.click(this.removeButtonFor(name));
  }

  async proceedToCheckout() {
    await this.click(this.checkoutButton);
    await this.waitForURL('**/checkout-step-one.html');
  }

  async continueShopping() {
    await this.click(this.continueShoppingButton);
    await this.waitForURL('**/inventory.html');
  }
}
