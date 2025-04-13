/**
 * Logging utility for server-side processes
 * Provides consistent logging format with timestamps and module context
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Synchronous logger class for server-side processes
 * Provides consistent logging format with timestamps and context
 */
export class SyncLogger {
  private context: string;
  
  /**
   * Create a new logger with the specified context
   * @param context The context/module name to associate with logs
   */
  constructor(context: string) {
    this.context = context;
  }
  
  /**
   * Log a message with the specified log level
   * @param message The message to log
   * @param level The log level (info, warn, error, debug)
   */
  log(message: string, level: LogLevel = 'info'): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${this.context}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
      default:
        console.log(formattedMessage);
        break;
    }
  }
  
  /**
   * Log an info level message
   * @param message The message to log
   */
  info(message: string): void {
    this.log(message, 'info');
  }
  
  /**
   * Log a warning level message
   * @param message The message to log
   */
  warn(message: string): void {
    this.log(message, 'warn');
  }
  
  /**
   * Log an error level message
   * @param message The message to log
   */
  error(message: string): void {
    this.log(message, 'error');
  }
  
  /**
   * Log a debug level message
   * @param message The message to log
   */
  debug(message: string): void {
    this.log(message, 'debug');
  }
}