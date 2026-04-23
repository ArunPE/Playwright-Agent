import { Page, Locator, expect, PageScreenshotOptions } from '@playwright/test';
import path from 'path';

export interface VisualOptions {
  threshold?: number;       // pixel diff tolerance (0–1), default 0.1
  maxDiffPixels?: number;   // absolute max pixels different
  animations?: 'disabled' | 'allow';
  mask?: Locator[];         // mask dynamic regions (ads, dates, avatars)
  fullPage?: boolean;
}

/**
 * VisualHelper — Snapshot-based visual regression.
 *
 * Features:
 *  ✅ Full-page and component-level screenshots
 *  ✅ Dynamic content masking (timestamps, avatars, ads)
 *  ✅ Configurable thresholds
 *  ✅ Auto-updates snapshots with UPDATE_SNAPSHOTS=true
 */
export class VisualHelper {
  private page: Page;
  private snapshotDir: string;
  private defaultOptions: VisualOptions;

  constructor(page: Page, snapshotDir = 'test-results/snapshots') {
    this.page = page;
    this.snapshotDir = snapshotDir;
    this.defaultOptions = {
      threshold: 0.1,
      animations: 'disabled',
      fullPage: false,
    };
  }

  /**
   * Assert full-page screenshot matches baseline.
   */
  async assertPageSnapshot(name: string, options: VisualOptions = {}): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    // Disable animations to prevent flaky snapshots
    if (opts.animations === 'disabled') {
      await this.page.addStyleTag({
        content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`,
      });
    }

    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      threshold: opts.threshold,
      maxDiffPixels: opts.maxDiffPixels,
      animations: opts.animations || 'disabled',
      mask: opts.mask,
      fullPage: opts.fullPage ?? false,
    });
  }

  /**
   * Assert element/component-level screenshot matches baseline.
   */
  async assertElementSnapshot(
    locator: Locator,
    name: string,
    options: VisualOptions = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    await expect(locator).toHaveScreenshot(`${name}.png`, {
      threshold: opts.threshold,
      maxDiffPixels: opts.maxDiffPixels,
      animations: opts.animations || 'disabled',
      mask: opts.mask,
    });
  }

  /**
   * Capture a screenshot (for debugging / manual review).
   */
  async capture(name: string, options: PageScreenshotOptions = {}): Promise<string> {
    const filePath = path.join(this.snapshotDir, `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true, ...options });
    return filePath;
  }

  /**
   * Hide dynamic elements before snapshotting to reduce noise.
   */
  async hideDynamicContent(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      await this.page
        .locator(selector)
        .evaluateAll((els) =>
          els.forEach((el) => ((el as HTMLElement).style.visibility = 'hidden'))
        )
        .catch(() => {});
    }
  }
}
