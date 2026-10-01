export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  connectorType?: string;
  userId?: string;
  requestId?: string;
  durationMs?: number;
  error?: Error;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  includeTimestamp: boolean;
  includeContext: boolean;
  prettyPrint: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: (Deno.env.get("LOG_LEVEL") as LogLevel) || "info",
  includeTimestamp: true,
  includeContext: true,
  prettyPrint: Deno.env.get("LOG_PRETTY") === "true",
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private config: LoggerConfig;
  private context: Record<string, unknown> = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    parts.push(`[${entry.level.toUpperCase()}]`);

    if (entry.connectorType) {
      parts.push(`[${entry.connectorType}]`);
    }

    if (entry.userId) {
      parts.push(`[user:${entry.userId}]`);
    }

    if (entry.requestId) {
      parts.push(`[req:${entry.requestId}]`);
    }

    parts.push(entry.message);

    if (this.config.includeContext && entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.durationMs !== undefined) {
      parts.push(`(${entry.durationMs}ms)`);
    }

    if (entry.error) {
      parts.push(`\n  Error: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\n  Stack: ${entry.error.stack}`);
      }
    }

    return parts.join(" ");
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "debug":
      case "info":
        console.log(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("error", message, context, error);
  }

  async time<T>(label: string, fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { ...context, durationMs: Math.round(duration) });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed`, { ...context, durationMs: Math.round(duration) }, error as Error);
      throw error;
    }
  }

  timeSync<T>(label: string, fn: () => T, context?: Record<string, unknown>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { ...context, durationMs: Math.round(duration) });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed`, { ...context, durationMs: Math.round(duration) }, error as Error);
      throw error;
    }
  }
}

export const logger = new Logger();

export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

export function createRequestLogger(requestId: string, userId?: string, connectorType?: string): Logger {
  return logger.child({ requestId, userId, connectorType });
}