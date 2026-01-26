/**
 * Structured logger for API routes and workers
 * Provides consistent logging format with request ID, userId, and log level
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In production, use structured logging (e.g., Cloud Logging)
    // For development, use console
    if (process.env.NODE_ENV === 'production') {
      // Structured JSON logging for Cloud Logging
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable logging for development
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}${contextStr}`);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log('error', error instanceof Error ? error.message : String(error), errorContext);
  }
}

export const logger = new Logger();
