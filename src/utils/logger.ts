import { createLogger, format, transports } from 'winston';
import path from 'path';

const logDir = 'test-results/logs';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      const line = `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}`;
      return stack ? `${line}\n${stack}` : line;
    })
  ),
  transports: [
    // Console — colored output
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss.SSS' }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level} ${message}`)
      ),
    }),
    // File — full logs
    new transports.File({
      filename: path.join(logDir, 'test-run.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    // File — errors only
    new transports.File({
      filename: path.join(logDir, 'errors.log'),
      level: 'error',
    }),
  ],
});
