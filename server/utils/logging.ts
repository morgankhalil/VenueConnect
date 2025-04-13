/**
 * Logging utilities for the application
 * Provides standardized logging with timestamps and categories
 */

/**
 * Logger for synchronization and data collection processes
 */
export class SyncLogger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  /**
   * Log an informational message
   */
  info(message: string): void {
    this.log('INFO', message);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    this.log('WARN', message);
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    this.log('ERROR', message);
  }

  /**
   * Log a debug message
   */
  debug(message: string): void {
    this.log('DEBUG', message);
  }

  /**
   * Format and output log message
   */
  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [${this.component}] ${level}: ${message}`);
  }
}