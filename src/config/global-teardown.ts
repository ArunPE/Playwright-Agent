import { FullConfig } from '@playwright/test';
import { logger } from '../utils/logger';

async function globalTeardown(_config: FullConfig): Promise<void> {
  logger.info('🧹 Global Teardown: Cleaning up...');
  // Add DB cleanup, test data teardown, etc. here
  logger.info('✅ Global Teardown: Complete');
}

export default globalTeardown;
