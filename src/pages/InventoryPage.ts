import { Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { logger } from '../utils/logger';

export class InventoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators ──────────────────────────────────────────────────

  get pageTitle() {
    return this.selfHeal({ css: '.title', text: 'Products' });
  }

  get productList() {
    return this.page.locator('.inventory_list');
  }

  get productItems() {
    return this.page.locator('.inventory_item');
  }

  get cartIcon() {
    return this.selfHeal({ css: '.shopping_cart_link' });
  }

  get cartBadge() {
    return this.page.locator('.shopping_cart_badge');
  }

  get sortDropdown() {
    return this.selfHeal({
      css: '.product_sort_container',
      role: 'combobox',
    });
  }

  get burgerMenu() {
    return this.page.locator('#react-burger-menu-btn');
  }

  get logoutLink() {
    return this.page.locator('#logout_sidebar_link');
  }

  // ── Product Helpers ───────────────────────────────────────────

  productByName(name: string) {
    return this.page.locator('.inventory_item').filter({ hasText: name });
  }

  addToCartButtonFor(productName: string) {
    return this.productByName(productName).locator('button');
  }

  productPriceFor(productName: string) {
    return this.productByName(productName).locator('.inventory_item_price');
  }

  // ── Actions ───────────────────────────────────────────────────

  async goto() {
    await this.navigate('/inventory.html');
  }

  async addToCart(productName: string) {
    logger.info(`🛒 Adding to cart: ${productName}`);
    await this.click(this.addToCartButtonFor(productName));
  }

  async removeFromCart(productName: string) {
    await this.click(this.addToCartButtonFor(productName));
  }

  async getCartCount(): Promise<number> {
    const visible = await this.isVisible(this.cartBadge);
    if (!visible) return 0;
    const text = await this.getTextContent(this.cartBadge);
    return parseInt(text, 10);
  }

  async sortBy(option: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.selectOption(this.sortDropdown, option);
    logger.info(`📊 Sorted by: ${option}`);
  }

  async getAllProductNames(): Promise<string[]> {
    return this.page.locator('.inventory_item_name').allTextContents();
  }

  async getAllProductPrices(): Promise<number[]> {
    const texts = await this.page.locator('.inventory_item_price').allTextContents();
    return texts.map((t) => parseFloat(t.replace('$', '')));
  }

  async goToCart() {
    await this.click(this.cartIcon);
    await this.waitForURL('**/cart.html');
  }

  async logout() {
    await this.click(this.burgerMenu);
    await this.waitForVisible(this.logoutLink);
    await this.click(this.logoutLink);
    await this.waitForURL('**/');
  }
}
