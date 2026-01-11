/**
 * Simple logging utility for monitoring and debugging
 * Logs to console in development, can be extended for production logging service
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry = this.formatMessage(level, message, context);

    if (this.isDevelopment) {
      // In development, log to console with colors
      const styles = {
        info: 'color: #4F46E5',
        warn: 'color: #FFD43B',
        error: 'color: #FF6B6B',
        debug: 'color: #51CF66',
      };

      console.log(
        `%c[${entry.level.toUpperCase()}] ${entry.timestamp}`,
        styles[level],
        message,
        context || ''
      );
    } else {
      // In production, you can send to logging service
      // Example: sendToLoggingService(entry);
      console[level](entry);
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };

