import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const AUTH_FILE = 'playwright/.auth/user.json';

async function globalSetup(_config: FullConfig) {
  logger.info('🚀 Global Setup: Starting...');

  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const baseURL = process.env.BASE_URL || 'https://www.saucedemo.com';
    const username = process.env.AUTH_USERNAME || 'standard_user';
    const password = process.env.AUTH_PASSWORD || 'secret_sauce';

    logger.info(`🔐 Logging into Sauce Demo as "${username}"`);

    await page.goto(baseURL);

    // Sauce Demo uses id-based inputs
    await page.locator('#user-name').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('#login-button').click();

    // Wait for inventory page — confirms successful login
    await page.waitForURL('**/inventory.html', { timeout: 15_000 });

    await context.storageState({ path: AUTH_FILE });
    logger.info('✅ Auth state cached — tests will skip login');
  } catch (error) {
    logger.warn('⚠️  Auth setup failed — writing empty state');
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
  } finally {
    await browser.close();
  }

  logger.info('✅ Global Setup: Complete');
}

export default globalSetup;
