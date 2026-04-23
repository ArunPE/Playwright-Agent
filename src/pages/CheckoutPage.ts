import { Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Step One
  get firstNameInput() { return this.page.locator('[data-test="firstName"]'); }
  get lastNameInput()  { return this.page.locator('[data-test="lastName"]'); }
  get postalCodeInput(){ return this.page.locator('[data-test="postalCode"]'); }
  get continueButton() { return this.page.locator('[data-test="continue"]'); }
  get errorMessage()   { return this.page.locator('[data-test="error"]'); }

  // Step Two (Overview)
  get itemTotal()      { return this.page.locator('.summary_subtotal_label'); }
  get taxAmount()      { return this.page.locator('.summary_tax_label'); }
  get totalAmount()    { return this.page.locator('.summary_total_label'); }
  get finishButton()   { return this.page.locator('[data-test="finish"]'); }

  // Confirmation
  get confirmationHeader() { return this.page.locator('.complete-header'); }

  async fillShippingInfo(firstName: string, lastName: string, postalCode: string) {
    await this.fill(this.firstNameInput, firstName);
    await this.fill(this.lastNameInput, lastName);
    await this.fill(this.postalCodeInput, postalCode);
    await this.click(this.continueButton);
    await this.waitForURL('**/checkout-step-two.html');
  }

  async getTotalAmount(): Promise<number> {
    const text = await this.getTextContent(this.totalAmount);
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  async finish() {
    await this.click(this.finishButton);
    await this.waitForURL('**/checkout-complete.html');
  }

  async isOrderComplete(): Promise<boolean> {
    return this.isVisible(this.confirmationHeader);
  }
}
